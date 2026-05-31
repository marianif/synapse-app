// .impeccable/generated/migrate-phase-1.mjs
// The Field migration — phase 1 (leaf: month-navigator).
// Strategy: shim carries the re-skin; this script promotes hardcoded literals only.
// Dotted-access renames (Surface.* -> tokens.*) are deferred to the cleanup commit.
//
// Usage:  node .impeccable/generated/migrate-phase-1.mjs           (dry-run, default)
//         node .impeccable/generated/migrate-phase-1.mjs --commit  (writes; needs clean tree)

import fs from "fs";
import path from "path";
import {
  promoteLiteral,
  planChanges,
  applyChanges,
  emitReport,
  checkGitClean,
} from "/Users/federicamariani/.claude/plugins/cache/flow/flow/0.10.0/.claude/skills/flow/scripts/shared/rewrite-helpers.mjs";

const rootDir = process.cwd();
const dryRun = !process.argv.includes("--commit");
const phase = 2;

const table = JSON.parse(
  fs.readFileSync(".impeccable/substitution-table.json", "utf-8"),
);
const brief = JSON.parse(
  fs.readFileSync(".impeccable/migration-brief.json", "utf-8"),
);
const phaseFiles = brief.dependencyOrder.phases.find(
  (p) => p.phase === phase,
).files;
const requiresAgent = [];

if (!dryRun) {
  const git = checkGitClean(rootDir);
  if (!git.clean) {
    console.error(git.reason);
    process.exit(1);
  }
}

const plan = planChanges();

for (const file of phaseFiles) {
  const abs = path.resolve(rootDir, file);
  if (!fs.existsSync(abs)) continue;
  let src = fs.readFileSync(abs, "utf-8");

  // Color-semantic literal promotions.
  for (const promo of table.literalPromotions) {
    if (!promo.affectedFiles.includes(file)) continue;
    plan.add(file, promoteLiteral(src, promo.literal, promo.newTokenExpression));
  }

  // Unresolved (overlay/scrim) promotions -> legacy tokens.colors.unresolved.*
  let touchedUnresolved = false;
  for (const promo of table.unresolvedPromotions) {
    if (!promo.affectedFiles.includes(file)) continue;
    const literals = promo.literalVariants ?? [promo.literal];
    for (const lit of literals) {
      plan.add(file, promoteLiteral(src, lit, promo.tokenExpression));
    }
    touchedUnresolved = true;
  }

  // Any promoted file that now references `tokens.` needs the import added by the agent.
  if (
    (touchedUnresolved ||
      table.literalPromotions.some((p) => p.affectedFiles.includes(file))) &&
    !/from\s+["']@\/constants\/theme["']/.test(src) === false &&
    !/\btokens\b/.test(src)
  ) {
    requiresAgent.push({
      file,
      reason: "add `import { tokens } from '@/constants/theme'` for promoted literal",
    });
  }
}

const results = applyChanges(plan, { rootDir, dryRun });
const { mdPath } = emitReport({
  rootDir,
  phase,
  plan,
  applyResults: results,
  requiresAgent,
});

console.log(
  `Phase ${phase} ${dryRun ? "dry-run" : "committed"}: ${results.written.length} files, ${plan.editCount()} edits.`,
);
console.log(`Report: ${mdPath}`);
if (results.conflicts.length > 0) process.exit(2);
