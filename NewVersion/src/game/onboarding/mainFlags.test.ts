import { describe, expect, it } from 'vitest';
import {
  createInitialMainFlags,
  EXTRA_MONEY_AMOUNT,
  grantExtraMoney,
  hintsCompleted,
  isHintDone,
  markHintDone,
  shouldShowHint,
  UI_HINT_IDS,
} from './mainFlags';
import type { HintContext, MainFlags } from './mainFlags';
import {
  decodeMainFlagFields,
  encodeMainFlagFields,
  EXTRA_MONEY_KEY,
  HINT_SAVE_KEYS,
} from './mainFlagsSave';
import { SAVE_SLOT_FIELDS } from '../save/saveSchema';
import { buildSlotBody, EMPTY_SAVE_STRING, parseSlotFields, writeSlot } from '../save/saveString';
import { encodeAchievementFields } from '../achievements/achievementSave';
import { createInitialStates } from '../achievements/achievementState';
import { createInitialLevelSelectData, encodeLevelSelectFields } from '../levels/levelProgressSave';
import { encodeUpgradeFields } from '../upgrades/upgradeSave';
import { createInitialUpgradeState } from '../upgrades/upgradeState';
import { encodeTutorialFields } from '../tutorial/tutorialSave';
import { createInitialTutorialState } from '../tutorial/tutorialState';
import { encodeEnemyKnowledgeFields } from '../enemies/enemyKnowledgeSave';
import { createInitialKnownEnemies } from '../enemies/enemyKnowledge';
import { encodeLoadoutFields } from '../loadout/loadoutSave';
import { createInitialLoadout } from '../loadout/loadout';

const ctx = (overrides: Partial<HintContext> = {}): HintContext => ({
  tutorialOn: true,
  currentWorldAndLevel: [1, 1],
  ...overrides,
});

describe('initial flags', () => {
  it('starts every flag false, matching Main.as', () => {
    const flags = createInitialMainFlags();
    for (const id of UI_HINT_IDS) expect(isHintDone(flags, id), id).toBe(false);
    expect(flags.extraMoneyGiven).toBe(false);
    expect(hintsCompleted(flags)).toBe(0);
  });

  it('has six hints', () => {
    expect(UI_HINT_IDS).toHaveLength(6);
  });
});

describe('shouldShowHint', () => {
  it('shows nothing when the tutorial is off', () => {
    const flags = createInitialMainFlags();
    for (const id of UI_HINT_IDS) {
      expect(shouldShowHint(flags, id, ctx({ tutorialOn: false })), id).toBe(false);
    }
  });

  it('shows a simple hint while the tutorial runs and it is not yet done', () => {
    const flags = createInitialMainFlags();
    expect(shouldShowHint(flags, 'ButtonLevel', ctx())).toBe(true);
    expect(shouldShowHint(flags, 'ButtonPlayLevel', ctx())).toBe(true);
    expect(shouldShowHint(flags, 'ButtonNextLevel', ctx())).toBe(true);
    expect(shouldShowHint(flags, 'ButtonSquarePage', ctx())).toBe(true);
  });

  it('stops showing once done', () => {
    const flags = markHintDone(createInitialMainFlags(), 'ButtonLevel');
    expect(shouldShowHint(flags, 'ButtonLevel', ctx())).toBe(false);
  });

  it('gates ButtonUpgrades behind ButtonNextLevel', () => {
    // ButtonUpgrades.as:104 — the upgrades hint cannot precede finishing a level.
    const fresh = createInitialMainFlags();
    expect(shouldShowHint(fresh, 'ButtonUpgrades', ctx())).toBe(false);

    const after = markHintDone(fresh, 'ButtonNextLevel');
    expect(shouldShowHint(after, 'ButtonUpgrades', ctx())).toBe(true);
  });

  it('gates DifficultyChosen behind world 2 or level 4', () => {
    // Same condition as the Pause tutorial trigger.
    const flags = createInitialMainFlags();
    expect(shouldShowHint(flags, 'DifficultyChosen', ctx({ currentWorldAndLevel: [1, 3] }))).toBe(
      false,
    );
    expect(shouldShowHint(flags, 'DifficultyChosen', ctx({ currentWorldAndLevel: [1, 4] }))).toBe(
      true,
    );
    expect(shouldShowHint(flags, 'DifficultyChosen', ctx({ currentWorldAndLevel: [2, 1] }))).toBe(
      true,
    );
  });
});

describe('markHintDone', () => {
  it('marks a hint', () => {
    const flags = markHintDone(createInitialMainFlags(), 'ButtonNextLevel');
    expect(isHintDone(flags, 'ButtonNextLevel')).toBe(true);
    expect(hintsCompleted(flags)).toBe(1);
  });

  it('marks ButtonLevel as a side effect of ButtonPlayLevel', () => {
    // ButtonPlayLevel.as:76-78 — reaching Play means the level button was found.
    const flags = markHintDone(createInitialMainFlags(), 'ButtonPlayLevel');
    expect(isHintDone(flags, 'ButtonPlayLevel')).toBe(true);
    expect(isHintDone(flags, 'ButtonLevel')).toBe(true);
    expect(hintsCompleted(flags)).toBe(2);
  });

  it('does not mutate the flags it was given', () => {
    const flags = createInitialMainFlags();
    markHintDone(flags, 'ButtonPlayLevel');
    expect(isHintDone(flags, 'ButtonLevel')).toBe(false);
  });

  it('returns the same object when nothing changes', () => {
    const once = markHintDone(createInitialMainFlags(), 'ButtonNextLevel');
    expect(markHintDone(once, 'ButtonNextLevel')).toBe(once);
  });

  it('still applies the side effect when only ButtonPlayLevel was already set', () => {
    const odd: MainFlags = {
      ...createInitialMainFlags(),
      uiHints: { ...createInitialMainFlags().uiHints, ButtonPlayLevel: true },
    };
    expect(markHintDone(odd, 'ButtonPlayLevel').uiHints.ButtonLevel).toBe(true);
  });

  it('leaves every hint hidden once all are done', () => {
    let flags = createInitialMainFlags();
    for (const id of UI_HINT_IDS) flags = markHintDone(flags, id);

    expect(hintsCompleted(flags)).toBe(6);
    for (const id of UI_HINT_IDS) {
      expect(shouldShowHint(flags, id, ctx({ currentWorldAndLevel: [5, 5] })), id).toBe(false);
    }
  });
});

describe('grantExtraMoney', () => {
  it('pays 10,000 once', () => {
    expect(EXTRA_MONEY_AMOUNT).toBe(10000);

    const result = grantExtraMoney(createInitialMainFlags(), 500, true);
    expect(result.granted).toBe(true);
    expect(result.money).toBe(10500);
    expect(result.flags.extraMoneyGiven).toBe(true);
  });

  it('never pays twice', () => {
    const first = grantExtraMoney(createInitialMainFlags(), 0, true);
    const second = grantExtraMoney(first.flags, first.money, true);

    expect(second.granted).toBe(false);
    expect(second.money).toBe(EXTRA_MONEY_AMOUNT);
    expect(second.flags).toBe(first.flags);
  });

  it('pays nothing without premium', () => {
    const result = grantExtraMoney(createInitialMainFlags(), 500, false);
    expect(result.granted).toBe(false);
    expect(result.money).toBe(500);
    expect(result.flags.extraMoneyGiven).toBe(false);
  });

  it('does not mutate the flags it was given', () => {
    const flags = createInitialMainFlags();
    grantExtraMoney(flags, 0, true);
    expect(flags.extraMoneyGiven).toBe(false);
  });
});

describe('save round trip', () => {
  it('emits the seven fields the schema declares for Main', () => {
    const fields = encodeMainFlagFields(createInitialMainFlags());
    expect(fields).toHaveLength(7);

    const schemaKeys = SAVE_SLOT_FIELDS.filter((f) => f.owner === 'Main').map((f) => f.key);
    expect(fields.map((f) => f.key).sort()).toEqual(schemaKeys.sort());
  });

  it('round-trips a fresh profile', () => {
    const flags = createInitialMainFlags();
    expect(decodeMainFlagFields(encodeMainFlagFields(flags))).toEqual(flags);
  });

  it('round-trips a fully-onboarded profile', () => {
    let flags = createInitialMainFlags();
    for (const id of UI_HINT_IDS) flags = markHintDone(flags, id);
    flags = grantExtraMoney(flags, 0, true).flags;

    expect(decodeMainFlagFields(encodeMainFlagFields(flags))).toEqual(flags);
  });

  it('round-trips a partly-onboarded profile', () => {
    let flags = markHintDone(createInitialMainFlags(), 'ButtonPlayLevel');
    flags = markHintDone(flags, 'ButtonNextLevel');
    expect(decodeMainFlagFields(encodeMainFlagFields(flags))).toEqual(flags);
  });

  it('encodes each flag as a single 1 or 0', () => {
    const flags = markHintDone(createInitialMainFlags(), 'ButtonNextLevel');
    const fields = encodeMainFlagFields(flags);

    expect(fields.find((f) => f.key === HINT_SAVE_KEYS.ButtonNextLevel)?.value).toBe('1');
    expect(fields.find((f) => f.key === HINT_SAVE_KEYS.ButtonSquarePage)?.value).toBe('0');
    for (const field of fields) expect(field.value).toMatch(/^[01]$/);
  });

  it('survives a trip through the save-string container', () => {
    const flags = grantExtraMoney(createInitialMainFlags(), 0, true).flags;
    const text = writeSlot(EMPTY_SAVE_STRING, 1, buildSlotBody(encodeMainFlagFields(flags)));
    expect(decodeMainFlagFields(parseSlotFields(text, 1))).toEqual(flags);
  });

  it('falls back to defaults when fields are absent', () => {
    expect(decodeMainFlagFields([])).toEqual(createInitialMainFlags());
  });

  it('reads anything other than exactly 1 as false', () => {
    // numberToBoolean compares against 1; for a one-shot flag the worst case is
    // a hint showing once more than it should.
    const decoded = decodeMainFlagFields([
      { key: HINT_SAVE_KEYS.ButtonLevel, value: '2' },
      { key: EXTRA_MONEY_KEY, value: 'yes' },
    ]);
    expect(decoded.uiHints.ButtonLevel).toBe(false);
    expect(decoded.extraMoneyGiven).toBe(false);
  });

  it('completes every non-computed field in the slot — 61 of 63', () => {
    const all = [
      ...encodeAchievementFields({
        states: createInitialStates(),
        totals: { enemyKills: 0, moneyEarned: 0 },
      }),
      ...encodeLevelSelectFields(createInitialLevelSelectData()),
      ...encodeUpgradeFields(createInitialUpgradeState()),
      ...encodeTutorialFields(createInitialTutorialState()),
      ...encodeEnemyKnowledgeFields(createInitialKnownEnemies()),
      ...encodeLoadoutFields(createInitialLoadout()),
      ...encodeMainFlagFields(createInitialMainFlags()),
    ];

    expect(all).toHaveLength(61);
    expect(new Set(all.map((f) => f.key)).size).toBe(61);

    // The two not covered are computed at save time, not owned by any class.
    const computed = SAVE_SLOT_FIELDS.filter((f) => f.owner === '(computed)').map((f) => f.key);
    expect(computed.sort()).toEqual(['dt', 'wl']);
    expect(SAVE_SLOT_FIELDS).toHaveLength(all.length + computed.length);

    const text = writeSlot(EMPTY_SAVE_STRING, 3, buildSlotBody(all));
    expect(decodeMainFlagFields(parseSlotFields(text, 3))).toEqual(createInitialMainFlags());
  });
});
