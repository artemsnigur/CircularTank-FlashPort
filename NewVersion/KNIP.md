# Reading `npm run knip`

Finds exports with **no production consumer**, which is the failure this project
kept hitting by hand: `isWaveComplete`, `getCurrentWorldAndLevel` and the
`levelProgress` helpers were each ported, fully tested, and called by nothing —
in one case for weeks. A green suite cannot see that, and neither can a
module-level reachability check, because those symbols live in files that *are*
imported.

## Why test files are not entry points

Deliberate. If tests counted as consumers, a ported-but-unwired function would
look used and the one signal worth having would disappear. So **"unused export"
here means "nothing outside a test calls it"**, and that is the thing to look at.

The cost is a benign baseline: constants exported so a test can assert against
them, and helpers only referenced inside their own file. Those are fine.

## Triage

For each finding, one of:

1. **A feature that was never wired.** The real catch. Wire it, or record why not.
2. **Exported only so a test can reach it.** Fine — but prefer testing through
   the public path where that is practical.
3. **Exported for no reason.** Drop the `export`; it is module-private.

## Not part of `data:check`

Left out on purpose. `data:check` gates the build and must stay a hard pass/fail
on generated data; this is a review list whose baseline is legitimately non-empty.
Run it when adding a module, and when picking up work after a break.
