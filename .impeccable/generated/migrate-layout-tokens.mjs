// .impeccable/generated/migrate-layout-tokens.mjs
// Phase 8 prep: rename scheme-independent layout/type shim members to tokens.*,
// so the compat shim can be deleted. Value-preserving (each old member already
// resolves to the token it's mapped to). Then fixes imports.
//
// Usage: node .impeccable/generated/migrate-layout-tokens.mjs [--commit]

import fs from "fs";
import path from "path";
import { execSync, } from "child_process";
import glob from "fs"; // unused; kept for clarity

const rootDir = process.cwd();
const dryRun = !process.argv.includes("--commit");

const RENAME = JSON.parse(fs.readFileSync("/tmp/layout-rename.json", "utf-8"));
const LAYOUT_SYMS = ["Spacing", "Radius", "FontSize", "FontFamily", "LineHeight", "LetterSpacing"];
const THEME_IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*(["'])@\/constants\/theme\2/;

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function listFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(full, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(full);
  }
  return out;
}

const files = [...listFiles(path.join(rootDir, "components")), ...listFiles(path.join(rootDir, "app"))];
let changed = 0;
const report = [];

for (const abs of files) {
  const rel = path.relative(rootDir, abs);
  let src = fs.readFileSync(abs, "utf-8");
  const orig = src;
  const edits = [];

  // 1. member renames (longest-first to avoid partial overlaps)
  for (const [oldExpr, newExpr] of Object.entries(RENAME).sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(`\\b${escapeRe(oldExpr)}\\b`, "g");
    if (re.test(src)) {
      src = src.replace(re, newExpr);
      edits.push(`${oldExpr} -> ${newExpr}`);
    }
  }

  if (src !== orig) {
    // 2. fix imports: add tokens if a tokens.* appeared; drop now-unused layout syms
    const m = src.match(THEME_IMPORT_RE);
    if (m) {
      let names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
      // drop layout syms no longer referenced in the (post-rename) body
      const body = src.replace(m[0], "");
      names = names.filter((n) => {
        if (LAYOUT_SYMS.includes(n)) {
          return new RegExp(`\\b${n}\\.`).test(body); // keep only if still used
        }
        return true;
      });
      if (/\btokens\./.test(src) && !names.includes("tokens")) names.push("tokens");
      // de-dup, stable
      names = [...new Set(names)];
      const newImport = m[0].replace("{" + m[1] + "}", "{ " + names.join(", ") + " }");
      src = src.replace(m[0], newImport);
    }
    changed++;
    report.push({ file: rel, edits });
    if (!dryRun) fs.writeFileSync(abs, src);
  }
}

const mdLines = [`# Layout-token rename ${dryRun ? "(dry-run)" : "(commit)"}`, ``, `files changed: ${changed}`, ``];
for (const r of report) mdLines.push(`### ${r.file}`, ...r.edits.map((e) => `- ${e}`), ``);
fs.writeFileSync(path.join(rootDir, ".impeccable/generated/layout-token-report.md"), mdLines.join("\n"));
console.log(`${dryRun ? "dry-run" : "committed"}: ${changed} files changed.`);
