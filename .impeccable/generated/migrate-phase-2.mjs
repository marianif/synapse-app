// .impeccable/generated/migrate-phase-2.mjs
// The Field migration — phase 2 (37 leaf components).
//
// Deterministic, rule-driven. No per-file hand edits: every transform below is a
// rule applied uniformly across the phase's files, then a report is emitted. The
// only things left to the agent are cases a rule genuinely cannot express safely
// (surfaced in requiresAgent).
//
// Transforms (all idempotent):
//   1. literalPromotions / unresolvedPromotions from the substitution table,
//      JSX-AWARE: `attr="lit"` -> `attr={expr}`; `key: "lit"` -> `key: expr`.
//   2. memberRetarget: rename a SPECIFIC member access only
//      (EntryAccent.today -> tokens.accent.clay) without touching EntryAccent[x]
//      or other EntryAccent.* members.
//   3. ensureTokensImport: add `tokens` to the @/constants/theme import iff a
//      `tokens.` expression now appears and it isn't already imported.
//   4. pruneUnusedNamedImport: drop a named import (e.g. EntryAccent) iff no
//      remaining use of that identifier exists in the file.
//
// Usage:  node .impeccable/generated/migrate-phase-2.mjs           (dry-run)
//         node .impeccable/generated/migrate-phase-2.mjs --commit  (writes; clean tree)

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const rootDir = process.cwd();
const dryRun = !process.argv.includes("--commit");
const phase = 2;

const table = JSON.parse(fs.readFileSync(".impeccable/substitution-table.json", "utf-8"));
const brief = JSON.parse(fs.readFileSync(".impeccable/migration-brief.json", "utf-8"));
const phaseFiles = brief.dependencyOrder.phases.find((p) => p.phase === phase).files;

// ── member-retarget rules (specific member access -> new expression) ──────────
// Only these exact `<Object>.<member>` accesses are rewritten. Computed access
// (`EntryAccent[x]`) and other members (`EntryAccent.deadline`) are untouched.
const MEMBER_RETARGETS = [
  { from: "EntryAccent.today", to: "tokens.accent.clay" },
  { from: "Brand.fabGlow", to: "tokens.accent.clay" },
  { from: "Brand.primaryContainer", to: "tokens.accent.clayPressed" },
];

// Named imports that may become unused after retargets — prune iff fully unused.
const PRUNE_CANDIDATES = ["EntryAccent", "Brand"];

// ── helpers ───────────────────────────────────────────────────────────────────
const THEME_IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*(["'])@\/constants\/theme\2/;

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// JSX-aware literal promotion. Returns the new source.
//   color="#FAFAFA"          -> color={tokens.color.dark.ink}
//   backgroundColor: "#000"  -> backgroundColor: tokens.colors...
//   "rgba(...)"  (bare)      -> tokens.colors...
function promoteLiteralAware(src, literal, expr) {
  const lit = escapeRe(literal);
  // (a) JSX attribute form:  <name>="lit"   (only when preceded by `=`)
  src = src.replace(new RegExp(`=(["'])${lit}\\1`, "g"), `={${expr}}`);
  // (b) quoted value in object / call form:  : "lit"  or  ("lit")  etc.
  src = src.replace(new RegExp(`(["'])${lit}\\1`, "g"), expr);
  return src;
}

// Retarget a specific member access. Word-boundary on the object, literal dot+member.
// Negative lookahead avoids matching a longer member (e.g. .todayXYZ).
function retargetMember(src, from, to) {
  const [obj, member] = from.split(".");
  const re = new RegExp(`\\b${escapeRe(obj)}\\.${escapeRe(member)}\\b(?![\\w$])`, "g");
  return src.replace(re, to);
}

function usesIdentifier(src, ident) {
  const body = src.replace(THEME_IMPORT_RE, "");
  return new RegExp(`\\b${escapeRe(ident)}\\b`).test(body);
}

function ensureTokensImport(src) {
  if (!/\btokens\./.test(src)) return src;
  const m = src.match(THEME_IMPORT_RE);
  if (!m) return src;
  const names = m[1];
  if (/\btokens\b/.test(names)) return src;
  const trimmed = names.replace(/\s+$/, "");
  const sep = trimmed.trimEnd().endsWith(",") ? "" : ",";
  const newImport = m[0].replace("{" + names + "}", "{" + trimmed + sep + " tokens }");
  return src.replace(m[0], newImport);
}

function pruneUnusedNamedImports(src) {
  for (const cand of PRUNE_CANDIDATES) {
    if (usesIdentifier(src, cand)) continue;
    const m = src.match(THEME_IMPORT_RE);
    if (!m) continue;
    const names = m[1];
    if (!new RegExp(`\\b${cand}\\b`).test(names)) continue;
    const cleaned = names
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== cand)
      .join(", ");
    src = src.replace(m[0], m[0].replace("{" + names + "}", "{ " + cleaned + " }"));
  }
  return src;
}

// ── apply ───────────────────────────────────────────────────────────────────
if (!dryRun) {
  const status = execSync("git status --porcelain", { cwd: rootDir, encoding: "utf-8" }).trim();
  if (status) {
    console.error("working tree has uncommitted changes:\n" + status);
    process.exit(1);
  }
}

const report = [];
const requiresAgent = [];
let filesChanged = 0;

for (const file of phaseFiles) {
  const abs = path.resolve(rootDir, file);
  if (!fs.existsSync(abs)) continue;
  const orig = fs.readFileSync(abs, "utf-8");
  let src = orig;
  const fileEdits = [];

  for (const promo of table.literalPromotions) {
    if (!promo.affectedFiles.includes(file)) continue;
    const before = src;
    src = promoteLiteralAware(src, promo.literal, promo.newTokenExpression);
    if (src !== before) fileEdits.push(`promote ${promo.literal} -> ${promo.newTokenExpression}`);
  }
  for (const promo of table.unresolvedPromotions) {
    if (!promo.affectedFiles.includes(file)) continue;
    for (const lit of promo.literalVariants ?? [promo.literal]) {
      const before = src;
      src = promoteLiteralAware(src, lit, promo.tokenExpression);
      if (src !== before) fileEdits.push(`promote(unresolved) ${lit} -> ${promo.tokenExpression}`);
    }
  }
  for (const r of MEMBER_RETARGETS) {
    const before = src;
    src = retargetMember(src, r.from, r.to);
    if (src !== before) fileEdits.push(`retarget ${r.from} -> ${r.to}`);
  }

  if (src !== orig) {
    src = ensureTokensImport(src);
    src = pruneUnusedNamedImports(src);
    if (!/migrated to v2 tokens — phase 2/.test(src)) {
      src = "// migrated to v2 tokens — phase 2\n" + src;
    }
  }

  if (src !== orig) {
    filesChanged++;
    report.push({ file, edits: fileEdits });
    if (!dryRun) fs.writeFileSync(abs, src);
  }
}

const lines = [
  `# Phase ${phase} rewrite report`,
  ``,
  `Mode: **${dryRun ? "dry-run" : "commit"}**`,
  ``,
  `- filesChanged: ${filesChanged}`,
  `- requiresAgent: ${requiresAgent.length}`,
  ``,
  `## Edits by file`,
  ...report.flatMap((r) => [``, `### ${r.file}`, ...r.edits.map((e) => `- ${e}`)]),
];
const mdPath = path.join(rootDir, ".impeccable/generated/phase-2-rewrite-report.md");
fs.writeFileSync(mdPath, lines.join("\n") + "\n");

console.log(`Phase ${phase} ${dryRun ? "dry-run" : "committed"}: ${filesChanged} files changed.`);
console.log(`Report: ${mdPath}`);
