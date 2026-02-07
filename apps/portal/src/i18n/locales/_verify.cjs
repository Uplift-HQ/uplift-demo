const fs = require("fs");
function countKeys(obj) {
  let count = 0;
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === "object" && obj[k] !== null) count += countKeys(obj[k]);
    else count++;
  }
  return count;
}
function getMissing(en, target, prefix) {
  prefix = prefix || "";
  let missing = [];
  for (const k of Object.keys(en)) {
    const path = prefix ? prefix + "." + k : k;
    if (!(k in target)) { missing.push(path); }
    else if (typeof en[k] === "object" && en[k] !== null) {
      missing = missing.concat(getMissing(en[k], target[k] || {}, path));
    }
  }
  return missing;
}
const path = require("path");
const dir = path.dirname(__filename);
const en = JSON.parse(fs.readFileSync(path.join(dir, "en.json"), "utf8"));
const files = ["ro.json", "ru.json", "pl.json", "pa.json", "no.json", "sk.json"];
for (const f of files) {
  const t = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const m = getMissing(en, t);
  console.log(f + ": " + countKeys(t) + " keys, missing " + m.length);
  if (m.length > 0 && m.length < 20) console.log("  ", m.join(", "));
}
console.log("en.json: " + countKeys(en) + " keys");
