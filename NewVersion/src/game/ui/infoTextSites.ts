/**
 * Every `PartInfoText.changeText` call site in the AS3, with the corner it asks
 * for and what the port does about it.
 *
 * ── Why this is a table and not a comment ─────────────────────────────────
 * The corner is two booleans passed positionally, four lines away from the text
 * they belong to, and often through locals called `right`/`bottom` that map to
 * parameters called `left`/`top`. The shop's pair was transcribed wrong on the
 * first attempt — `showTop: false` against the source's `true`, cited to a
 * description string rather than to the call — and neither typecheck nor the
 * suite could see it, because both values are valid booleans.
 *
 * So the corners live here, each against its AS3 line, and the screens read
 * them rather than restating them. `infoTextSites.test.ts` pins the values
 * against the source lines; a screen that opens the wrong way now needs two
 * edits that disagree, not one that drifts.
 *
 * ── The reachable surface is 8 sites, not 20 ──────────────────────────────
 * Step 1 was scoped as "14 core + 2 rich text". The count is right about the
 * AS3 and wrong about this port: of the 14 plain-text sites, **two** have a
 * live consumer here — the shop row and, since step 2, the bestiary's
 * resistance badges. Four are icon buttons whose tooltip is the button's own
 * name, which this port renders as a visible text label; the rest hang off
 * screens or features that are not ported (Credits, Armor Games online saves)
 * or are deferred (Level Guide, `EnemyStrengthsWeaknesses`).
 *
 * That is recorded per row rather than in a report, because the person who
 * builds the Credits screen is the one who needs it, and `status` says exactly
 * what each is waiting on.
 *
 * **Since T102 the Level Guide's four sites are wired**, so what remains is
 * four `redundant` rows, five with no consumer, and three deferred on two
 * dependencies: a level-select enemy roster (`ImageEnemy` x2, plus
 * `addStrengthsAndWeaknessIcons`' unported `"Normal"` branch) and the
 * level-complete status screen (`Achievement.as:103`).
 */

/** `:168` — `changeText(theText, left, top, specialType, p1, p2)`. */
export interface InfoTextSite {
  /** `<Class>.as:<line>` of the `changeText` call. */
  source: string;
  /** The `left` argument — panel opens rightward from the cursor when true. */
  showLeft: boolean;
  /** The `top` argument — panel opens downward from the cursor when true. */
  showTop: boolean;
  /** `:168`'s `specialType`, when the site asks for a structured renderer. */
  special?: 'Achievement' | 'EnemyStrengthsWeaknesses' | 'AllEnemiesInLevel';
  /**
   * `wired` — a live consumer in this port reads this row.
   * `redundant` — faithful, but the tooltip text is a label the port already
   *   shows on the control itself, so porting it would add nothing.
   * `no-consumer` — the screen or feature it hangs off is not ported.
   * `deferred` — waiting on named work.
   */
  status: 'wired' | 'redundant' | 'no-consumer' | 'deferred';
  /** What it is waiting on, or why it will never be wired. */
  note: string;
}

export const INFO_TEXT_SITES: readonly InfoTextSite[] = Object.freeze([
  // ── Wired ───────────────────────────────────────────────────────────────
  {
    source: 'ButtonUpgradeInfo.as:163',
    // `right = false; bottom = true` at `:34-35`, restated at `:39-40`.
    showLeft: false,
    showTop: true,
    status: 'wired',
    note: 'Shop rows — UpgradesScreen.tsx. Text from ButtonUpgradeInfo.as, 28 strings.',
  },
  {
    source: 'IconStrongWeak.as:48',
    showLeft: false,
    showTop: false,
    status: 'wired',
    // `theText` is set by the owner beside the frame (`ScreenEnemies.as:339-374`),
    // which is why the label lives in `resistanceIcons.ts` rather than here.
    note: 'Resistance badges on the bestiary — ResistanceIcon.tsx. Label per damage type.',
  },
  {
    source: 'ButtonNextLevel.as:208',
    showLeft: false,
    showTop: false,
    special: 'AllEnemiesInLevel',
    status: 'wired',
    note: 'Next-level preview on the results overlay — Hud.tsx NextLevelButton.',
  },
  { source: 'ButtonLevelGuideInfo.as:64', showLeft: false, showTop: false, special: 'AllEnemiesInLevel', status: 'wired', note: 'Level guide info icon — LevelGuideWidget.tsx, reusing levelPreview().' },
  { source: 'ButtonLevelGuideSelect.as:81', showLeft: false, showTop: false, status: 'wired', note: 'The three preset buttons, one fixed string each (`:44-56`).' },
  { source: 'ButtonLevelGuideAutoSelect.as:38', showLeft: false, showTop: false, status: 'wired', note: 'The auto-select toggle. Stateful text — names Enabled/Disabled (`:60`, `:64`).' },
  { source: 'ButtonLevelGuideAutoSelect.as:104', showLeft: false, showTop: false, status: 'wired', note: 'The same tooltip re-asserted from the roll-over branch; one component covers both.' },
  {
    source: 'Achievement.as:99',
    showLeft: true,
    showTop: false,
    special: 'Achievement',
    status: 'wired',
    note: 'Achievement cells — AchievementsScreen.tsx. Three styled runs.',
  },

  // ── Faithful, but the port already shows the text on the control ────────
  // The AS3's menu buttons are icons; ours are text buttons captioned with the
  // same word, so the tooltip would repeat the label under the cursor.
  { source: 'ButtonAchievements.as:56', showLeft: false, showTop: false, status: 'redundant', note: 'Text is "Achievements"; MainMenuScreen renders that as the button label.' },
  { source: 'ButtonEnemies.as:56', showLeft: false, showTop: false, status: 'redundant', note: 'Text is "Enemies"; rendered as the button label.' },
  { source: 'ButtonMenu.as:46', showLeft: false, showTop: false, status: 'redundant', note: 'Text is "Menu"; the port\'s back button is captioned "‹ MENU".' },
  { source: 'ButtonOptions.as:56', showLeft: false, showTop: false, status: 'redundant', note: 'Text is "Options"; rendered as the button label.' },

  // ── No consumer in this port ────────────────────────────────────────────
  { source: 'ButtonCredit.as:37', showLeft: true, showTop: false, status: 'no-consumer', note: 'Credits screen is not ported. Text: "Testing & Editing by Wesley Jue".' },
  { source: 'ButtonPremium.as:73', showLeft: false, showTop: false, status: 'no-consumer', note: 'Sponsor buttons ("Armor Games", "WTFCake") — third-party, not ported.' },
  { source: 'ButtonSaveInfo.as:52', showLeft: false, showTop: true, status: 'no-consumer', note: 'Explains local vs online saves; this port has local slots only.' },
  { source: 'ButtonSaveInfo.as:56', showLeft: false, showTop: true, status: 'no-consumer', note: 'The online half of the same pair.' },
  { source: 'ButtonConvertSave.as:78', showLeft: true, showTop: true, status: 'no-consumer', note: 'Armor Games online saves are not ported.' },

  // ── Deferred, with the thing each waits on ──────────────────────────────
  { source: 'ImageEnemy.as:174', showLeft: false, showTop: false, special: 'EnemyStrengthsWeaknesses', status: 'deferred', note: 'PartInfoText step 2. `right`/`bottom` are initialised false at ImageEnemy.as:168-169 and never reassigned.' },
  { source: 'ImageEnemy.as:178', showLeft: false, showTop: false, special: 'EnemyStrengthsWeaknesses', status: 'deferred', note: 'Same, with " Boss" appended to the name.' },
  {
    source: 'Achievement.as:103',
    showLeft: false,
    showTop: false,
    special: 'Achievement',
    status: 'deferred',
    // The *other* branch of the same `if`, and the reason `:99` alone is not
    // the whole story: on the end-of-level status screen the same cell opens
    // the opposite way horizontally.
    note: 'The `onStatusScreen` branch — achievements are not shown on the level-complete screen yet.',
  },
]);

/** Looks up a site's corner. Throws rather than defaulting: a silent fallback
 *  to `false, false` is how the shop opened the wrong way in the first place. */
export function siteCorner(source: string): { showLeft: boolean; showTop: boolean } {
  const site = INFO_TEXT_SITES.find((s) => s.source === source);
  if (!site) throw new Error(`No PartInfoText call site recorded for ${source}`);
  return { showLeft: site.showLeft, showTop: site.showTop };
}
