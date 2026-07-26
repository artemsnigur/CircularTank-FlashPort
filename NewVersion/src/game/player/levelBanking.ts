/**
 * What a finished level writes to the save — and what a sandbox run does not.
 *
 * This is the tail of `GameplayScene`'s level-end handling, lifted out for one
 * reason: **it carries save integrity and the scene cannot be instantiated in a
 * test.** Left inline, the only available check was a regex over the scene's
 * source, and a source-shape test cannot see a guard that is present but never
 * reached, or a flag that is forwarded and then ignored. Both are exactly the
 * failure this guard exists to prevent, and both are in this project's history.
 *
 * Out here it is a plain function over a small interface, so a test can drive a
 * real `PlayerProfile` over real storage and compare the encoded save string
 * byte for byte.
 *
 * ── Why all three writes share one guard ──────────────────────────────────
 * Money, the level result and "where the player was" have to stay out of the
 * save *together*. Guarding them individually risks a half-updated profile —
 * the exact shape of the bug this replaces, where the world-0 sentinel no-oped
 * `recordLevelResult` while the money and `previousWorld` writes went through
 * anyway and were persisted.
 */
import type { Difficulty } from '../config/constants';
import type { UpgradeState } from '../upgrades/upgradeState';

/**
 * The slice of `PlayerProfile` this needs.
 *
 * Narrow on purpose: a test can satisfy it with the real class, and the
 * function cannot quietly reach for anything else on the profile.
 */
export interface BankingTarget {
  setUpgrades(next: UpgradeState): void;
  recordLevel(
    world: number,
    level: number,
    difficulty: Difficulty,
    value: number,
    won: boolean,
  ): void;
  save(): void;
}

export interface LevelBankingInput {
  /** A dev run. Nothing is written. See `ui:start-game`. */
  sandbox: boolean;
  /** The upgrade state to persist money against. */
  upgrades: UpgradeState;
  /**
   * The running total, not the level's takings — `currency` already includes
   * the opening balance, so this is assigned rather than added. Adding would
   * double-count.
   */
  currency: number;
  world: number;
  level: number;
  difficulty: Difficulty;
  won: boolean;
}

/**
 * Banks a finished level, unless the run is a sandbox.
 *
 * Returns whether anything was written, so the caller can log or assert on it
 * rather than inferring from side effects.
 */
export function bankLevelOutcome(profile: BankingTarget, input: LevelBankingInput): boolean {
  if (input.sandbox) return false;

  profile.setUpgrades({ ...input.upgrades, money: input.currency });

  // A win records a value against the level, which is what unlocks the next one
  // (`ScreenLevelSelect.as:842` locks a level whose predecessor scored zero). A
  // loss still updates "where the player was" but scores nothing, so it cannot
  // unlock anything.
  profile.recordLevel(input.world, input.level, input.difficulty, input.won ? 1 : 0, input.won);
  profile.save();
  return true;
}
