#!/usr/bin/env node
// Create then delete one QA dashboard and one QA rule chain; stops on first failure. Usage: node entity-smoke.mjs <alias>
import { loadAccount } from './lib/accounts-env.mjs';
import { openProfile } from './lib/thingsboard.mjs';
import { createEntity, deleteEntity } from './lib/thingsboard-entities.mjs';

const alias = process.argv[2] ?? 'thingsboard-admin';
const stamp = new Date().toISOString().slice(2, 16).replace(/\D/g, '');
const acc = loadAccount(alias);
const { release, page } = await openProfile(acc);
const log = [];
try {
  for (const [kind, name] of [['dashboard', `QA-dashboard-${stamp}`], ['ruleChain', `QA-rulechain-${stamp}`]]) {
    for (const [action, fn] of [['create', createEntity], ['delete', deleteEntity]]) {
      const r = await fn(page, acc, kind, name);
      log.push({ kind, action, ...r });
      if (r.status !== 'DONE') throw new Error(`${action} ${kind} ${r.status}: ${r.reason}`);
    }
  }
} catch (e) {
  log.push({ status: 'STOPPED', reason: String(e.message).split('\n')[0] });
  await page.screenshot({ path: new URL('../../private/browser/state/last-failure.png', import.meta.url).pathname }).catch(() => {});
} finally {
  console.log(JSON.stringify(log, null, 1));
  await release(); // disconnect only; window stays open
}
