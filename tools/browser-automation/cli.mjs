#!/usr/bin/env node
// Usage: node cli.mjs <status|login|logout|relogin|totp|close> <profile-alias>
// Credentials come from private/accounts.env; output is short JSON, never secrets.
import { loadAccount } from './lib/accounts-env.mjs';
import { totp, secondsRemaining } from './lib/totp.mjs';
import { openProfile, isLoggedIn, login, logout } from './lib/thingsboard.mjs';
import { closeChrome } from './lib/chrome-session.mjs';

const [cmd, alias = 'thingsboard-admin'] = process.argv.slice(2);
const COMMANDS = ['status', 'login', 'logout', 'relogin', 'totp', 'close'];
if (!COMMANDS.includes(cmd)) {
  console.error(`Usage: node cli.mjs <${COMMANDS.join('|')}> <profile-alias>`);
  process.exit(2);
}

let acc;
try {
  acc = loadAccount(alias);
} catch (e) {
  console.log(JSON.stringify({ alias, cmd, status: 'BLOCKED', reason: e.message }));
  process.exit(1);
}

if (cmd === 'totp') {
  if (!acc.totpSecret) throw new Error('TOTP_SECRET is empty for this alias');
  console.log(JSON.stringify({ alias, code: totp(acc.totpSecret), expiresInSec: secondsRemaining() }));
  process.exit(0);
}

// The Chrome window stays open after every command; only `close` quits it.
if (cmd === 'close') {
  console.log(JSON.stringify({ alias, cmd, status: 'DONE', closed: await closeChrome(acc) }));
  process.exit(0);
}

const { release, page } = await openProfile(acc);
let result;
try {
  if (cmd === 'status') result = { status: 'DONE', loggedIn: await isLoggedIn(page, acc), url: page.url() };
  if (cmd === 'login') result = await login(page, acc);
  if (cmd === 'logout') result = await logout(page, acc);
  if (cmd === 'relogin') {
    const out = await logout(page, acc);
    result = out.status === 'DONE' ? await login(page, acc) : out;
  }
} catch (e) {
  result = { status: 'FAILED', reason: String(e.message).split('\n')[0] };
} finally {
  console.log(JSON.stringify({ alias, cmd, ...result }));
  await release();
}
process.exit(result.status === 'DONE' ? 0 : 1);
