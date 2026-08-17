/**
 * What colour each medal on a level tile is — `ScreenLevelSelect.as:849-910`.
 *
 * ── The rule is per-*medal*, not per-level ────────────────────────────────
 * The obvious reading is "colour the row by the best difficulty beaten". The
 * AS3 does something finer, and a level can carry three different colours at
 * once.
 *
 * `:849` loops `iii` over the three tiers and, inside it, `ii` over that tier's
 * medal count, placing each icon at `x = 10 + ii * 11` — so **`ii` is a slot**,
 * and every tier competes for the same three positions. The suppressions at
 * `:863` and `:870` resolve the collisions: tier 1 skips a slot tier 0 already
 * filled, tier 2 skips one either of the others filled. Gold therefore wins a
 * slot, then silver, then bronze.
 *
 * So a player who took 3 medals on Easy, 2 on Medium and 1 on Hard sees
 * **gold, silver, bronze** — a visible record of how far they got at each
 * difficulty, in one row.
 *
 * ── Two things that follow, both of which the port had wrong ──────────────
 * 1. **The count is the best tier's, not the selected difficulty's.**
 *    `:841` reads the whole `valuesArray[i]` triple; nothing consults the
 *    difficulty buttons. A level taken 3-medal on Easy shows three bronze
 *    medals while `HARD` is selected — which is exactly what the reference
 *    capture shows. The port showed the *current* difficulty's count, so that
 *    level read as zero medals on Hard.
 * 2. **The frames are 3/2/1 for gold/silver/bronze** (`:898-908`), against
 *    slots 0/1/2 of the values triple. `DIFFICULTY_SLOT` already agrees:
 *    Hard 0, Medium 1, Easy 2.
 *
 * ── Not ported here, and worth knowing ───────────────────────────────────
 * The icon's **shape** follows the level mode — `IconStar`, `IconFlag`,
 * `IconShield`, `IconTower`, `IconBoss` (`:876-896`). This module answers the
 * colour question only; the port draws a star for every mode. Recorded as
 * `A34`.
 */
import { MAX_LEVEL_VALUE } from './levelProgress';
import type { LevelValues } from './levelProgress';

/** Gold, silver, bronze — `iconS.gotoAndStop(3 | 2 | 1)`. */
export type MedalTier = 'gold' | 'silver' | 'bronze';

/**
 * The tier of each medal shown, best first, or `[]` for an untouched level.
 *
 * Length is the highest of the three counts, which is `:1551`'s bronze rule
 * seen from the other side: bronze is the max because beating a level on Hard
 * implies you could have beaten it on Easy.
 *
 * @param values `[hard, medium, easy]` — the slot order `DIFFICULTY_SLOT` uses
 *   and the AS3's own (`:1542` reads index 0 as gold).
 */
export function medalTiers(values: LevelValues): MedalTier[] {
  const tiers: MedalTier[] = [];

  for (let slot = 0; slot < MAX_LEVEL_VALUE; slot += 1) {
    // Highest tier that reached this slot takes it — `:858`, `:863`, `:870`
    // collapsed, since a suppression by a higher tier is the same as that tier
    // having claimed the slot first.
    if (values[0] > slot) tiers.push('gold');
    else if (values[1] > slot) tiers.push('silver');
    else if (values[2] > slot) tiers.push('bronze');
  }

  return tiers;
}
