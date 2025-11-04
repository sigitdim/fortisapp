const fs = require("fs");
const path = require("path");

const apiPath = path.resolve(process.cwd(), "lib/api.ts");
const contractPath = path.resolve(process.cwd(), "lib/api.contract.json");

const src = fs.readFileSync(apiPath, "utf8");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));

const missing = [];
for (const name of contract.mustExport) {
  // cek minimal ada "export function name" atau "export { ... name ... }" atau ada di default object
  const pat =
    new RegExp(`export\\s+(async\\s+)?function\\s+${name}\\b`) ||
    new RegExp(`export\\s*{[^}]*\\b${name}\\b[^}]*}`, "m") ||
    new RegExp(`const\\s*_default\\s*=\\s*{[\\s\\S]*\\b${name}\\b[\\s\\S]*}`, "m");
  if (!(
      new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`).test(src) ||
      new RegExp(`export\\s*{[\\s\\S]*\\b${name}\\b[\\s\\S]*}`, "m").test(src) ||
      new RegExp(`const\\s*_default\\s*=\\s*{[\\s\\S]*\\b${name}\\b[\\s\\S]*}`, "m").test(src)
    )) {
    missing.push(name);
  }
}

if (missing.length) {
  console.error("❌ lib/api.ts missing exports:", missing.join(", "));
  process.exit(1);
}
console.log("✅ lib/api.ts exports OK");
