// Kiểm tra cấu trúc thư mục frontend (Node thuần, không cần dependency).
// Chạy: npm run check:structure  -> exit 1 nếu vi phạm quy ước.
//
// Quy ước (xem docs/codebase-summary.md):
//  1. Không để file .ts/.tsx rời ở gốc src/components/admin/ và src/components/exam/
//     (phải nằm trong thư mục con theo màn hình hoặc kỹ năng).
//  2. Không import từ thư mục đã bỏ: @/utils/, @/mocks/, @/components/exam/clean/.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const errors = [];

// 1. File rời ở gốc các thư mục component cấm.
for (const dir of ["components/admin", "components/exam"]) {
  const abs = join(src, dir);
  for (const name of readdirSync(abs)) {
    if (/\.tsx?$/.test(name) && statSync(join(abs, name)).isFile()) {
      errors.push(`File rời ở gốc src/${dir}/: ${name} (dời vào thư mục con)`);
    }
  }
}

// 2. Import tới đường dẫn bị cấm (import tĩnh, export from và import() động).
const banned = [/@\/utils\//, /@\/mocks\//, /@\/components\/exam\/clean\//];
const importLine = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|mts|js|jsx)$/.test(name)) scan(p);
  }
}

function scan(file) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(importLine)) {
    if (banned.some((re) => re.test(m[1]))) {
      errors.push(`Import bị cấm "${m[1]}" trong ${relative(root, file)}`);
    }
  }
}

walk(src);

if (errors.length) {
  console.error("check:structure FAIL\n" + errors.map((e) => " - " + e).join("\n"));
  process.exit(1);
}
console.log("check:structure OK");
