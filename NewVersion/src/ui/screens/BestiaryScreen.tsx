/**
 * The bestiary — `ScreenEnemies.as`.
 *
 * The player-facing view: which enemies have been met, and what is known about
 * them. `EnemiesScreen` is the development board and is a different screen for
 * a different audience.
 *
 * ── Grid left, window right — the original's own shape ────────────────────
 * `addEnemyButtons` (`:277-303`) lays the roster out five to a row on a 41px
 * pitch, and `bgWindow` (`:235`) is pinned to the stage's right edge with the
 * name, the description, the two selector rows and the stats in it. T179
 * rebuilt this port to that arrangement; it had been a vertical list with every
 * enemy's stats inline, which is a different screen wearing the same title.
 *
 * So there is a **selection** now, as there is in the AS3 (`selectedEnemy`):
 * clicking a tile locks that enemy into the window. Hovering raises the cursor
 * card and changes nothing, which is the rule `A8` settled for level select and
 * is applied here for the same reason.
 *
 * ── All twenty show, and there is no `More Enemies` button ────────────────
 * `addEnemyButtons` sets `hideAmount = 5` when `!Main.extraStuff` (`:283-286`)
 * and `:254` adds `ButtonMoreEnemies` under the same condition — so the
 * original's 5x3 grid with an upsell beneath it is the state of a build that
 * has *not* been paid for. `Main.extraStuff` is set by an Armor Games or
 * Kongregate purchase check (`Main.as:380`, `:414`), both of which are on this
 * project's "will never be ported" list.
 *
 * **So a 5x4 grid with no button is not a divergence — it is the AS3's other
 * branch**, the one `extraStuff = true` takes. Adding the button would mean
 * adding a control that has nowhere to go, which is the same call `A35` made
 * for `More Worlds` on the world picker.
 *
 * ── It still cannot see what it must not show ─────────────────────────────
 * Renders entirely from `bestiary`, which `BestiaryScene` publishes off the
 * profile. This component does no lookups of its own — in particular it never
 * reads `BESTIARY`, `bestiaryArt` or `bestiaryStats` directly, because any of
 * them would let it answer "what is enemy X" for an X the player has never met.
 * `BestiaryScreen.test.tsx` enforces that by reading this file.
 *
 * The restructure did not weaken it, and in one place strengthened it: a locked
 * tile now draws **no art at all**, a CSS "?" instead of the AS3's frame-4
 * glyph, so there is not even a shape id in the DOM for an unmet enemy.
 */
import { useState } from 'react';

import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';
import { ScreenShell } from '../ScreenShell';
import { CursorTip } from '../CursorTooltip';
import { ResistanceIcon } from '../ResistanceIcon';
import { EnemyTile } from '../EnemyTile';
import type { ResistanceBadge } from '../../game/enemies/resistanceIcons';
import { BESTIARY_TIERS, TIER_LABEL } from '../../game/enemies/bestiaryView';
import type { BestiaryStats, BestiaryView } from '../../game/enemies/bestiaryView';
import { Difficulties } from '../../game/config/constants';

/**
 * One row of the listing, as this screen sees it.
 *
 * Typed structurally rather than imported: the listing's own type lives beside
 * the builder in `enemyKnowledge`, which this file is barred from importing.
 */
interface BestiaryRow {
  id: string;
  displayName: string;
  description?: string;
  strengths: ResistanceBadge[];
  weaknesses: ResistanceBadge[];
  tile: readonly number[];
  stats?: BestiaryStats;
  known: boolean;
}

/**
 * One resistance row — the AS3 draws the badges alone, with no caption.
 *
 * A caption is added here because the original's two rows are told apart by
 * their **badge colour and stage position** (`y = 348` against `y = 408`), and
 * this port stacks them in flow where neither cue survives on its own. The
 * colours still differ; the words say which is which without relying on that.
 */
function ResistanceRow({
  label,
  badges,
}: {
  label: string;
  badges: ResistanceBadge[];
}): React.ReactElement {
  return (
    <div className="bestiary__resist">
      <p className="bestiary__label">{label}</p>
      <div className="bestiary__badges">
        {badges.length === 0 ? (
          // Unmet: the listing sends no badges at all, which is different from
          // "has no strengths" — that case arrives as the frame-1 placeholder.
          <span className="bestiary__badge-none">???</span>
        ) : (
          badges.map((badge, i) => (
            <ResistanceIcon key={`${badge.frame}-${i}`} badge={badge} />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * The four stat lines — `ScreenEnemies.as:544-567`.
 *
 * The AS3 prints each as one string ("Health: 120 HP"); split into a label and
 * a value here so the numbers can line up in a column, which a proportional
 * DOM font needs and a fixed stage layout did not.
 */
function StatBlock({ stats }: { stats: BestiaryStats | undefined }): React.ReactElement {
  const speed =
    stats === undefined
      ? '???'
      : stats.speedMax === undefined
        ? `${stats.speed}`
        : `${stats.speed}-${stats.speedMax}`;

  const rows: [string, string][] = [
    ['Money', stats === undefined ? '???' : `${stats.money}$`],
    ['Health', stats === undefined ? '???' : `${stats.health} HP`],
    ['Damage', stats === undefined ? '???' : `${stats.damage} HP`],
    // `:551` — px per second. The range form is Temperamental's and
    // Accelerating's only; see `bestiaryStats.ts`.
    ['Speed', stats === undefined ? '???' : `${speed} PX/Sec`],
  ];

  return (
    <dl className="bestiary-stats">
      {rows.map(([label, value]) => (
        <div key={label} className="bestiary-stats__item">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The difficulty and tier selectors — `ScreenEnemies.as:583-624`.
 *
 * **One pair for the whole screen, not one per row.** Both are statics in the
 * original (`enemyDifficulty`, `selectedEnemyLevel`), so a change re-reads
 * every enemy; twenty copies of a single setting would be twenty ways to ask
 * the same question.
 *
 * The scene owns the state. This emits and re-renders from what comes back, so
 * the buttons cannot claim a selection the numbers do not reflect.
 *
 * **Styled by `.difficulty__button`, which is the shared pill.** It was
 * `.chrome-tab` until T179. Both are shared primitives rather than a fork —
 * that was the point of the T159 change and it still holds — and the pill is
 * what the rest of this UI now uses for "exactly one of these is chosen".
 * `aria-pressed` is unchanged and deliberately not `aria-current`: these filter
 * a table, they do not navigate.
 */
function ViewControls({ view }: { view: BestiaryView }): React.ReactElement {
  const set = (next: Partial<BestiaryView>): void => {
    GameEvents.emit('ui:bestiary-view', { ...view, ...next });
  };

  return (
    <>
      <p className="bestiary__label">Difficulty</p>
      <div className="difficulty" role="group" aria-label="Difficulty">
        {Difficulties.map((difficulty) => {
          const selected = view.difficulty === difficulty;
          return (
            <button
              key={difficulty}
              type="button"
              className={`difficulty__button difficulty__button--${difficulty.toLowerCase()}${
                selected ? ' difficulty__button--on' : ''
              }`}
              aria-pressed={selected}
              onClick={() => set({ difficulty })}
            >
              {difficulty}
            </button>
          );
        })}
      </div>

      <p className="bestiary__label">Enemy level</p>
      {/* Four, not three — so its own container rather than `.difficulty`,
          which is a three-column grid. The buttons are the same pill. */}
      <div className="bestiary__tiers" role="group" aria-label="Enemy level">
        {BESTIARY_TIERS.map((tier) => {
          const selected = view.tier === tier;
          return (
            <button
              key={tier}
              type="button"
              className={`difficulty__button${selected ? ' difficulty__button--on' : ''}`}
              aria-pressed={selected}
              onClick={() => set({ tier })}
            >
              {TIER_LABEL[tier]}
            </button>
          );
        })}
      </div>
    </>
  );
}

/**
 * One tile in the roster grid.
 *
 * A button, because clicking it selects — and `aria-pressed` rather than
 * `aria-current` for the same reason the selectors use it.
 */
function RosterTile({
  entry,
  selected,
  onSelect,
  onHover,
}: {
  entry: BestiaryRow;
  selected: boolean;
  onSelect: () => void;
  onHover: (entry: BestiaryRow | null) => void;
}): React.ReactElement {
  return (
    <li className="bestiary__slot">
      <button
        type="button"
        className={`bestiary-tile${entry.known ? '' : ' bestiary-tile--locked'}${
          selected ? ' bestiary-tile--on' : ''
        }`}
        aria-pressed={selected}
        aria-label={entry.known ? entry.displayName : 'Not yet encountered'}
        onClick={onSelect}
        onMouseEnter={() => onHover(entry)}
        onMouseLeave={() => onHover(null)}
      >
        {entry.known ? (
          /*
            The enemy's picture — `ButtonEnemy<Type>` frame 1. Which frame the
            listing sends is decided there, not here: this screen is not
            allowed to know what a locked enemy looks like, which is the same
            rule that keeps the description out of it.
          */
          <EnemyTile layers={entry.tile} label={entry.displayName} size="72%" />
        ) : (
          /*
            The locked tile is CSS type, not the AS3's frame-4 "?" glyph.

            The frame is three shapes — plate, overlay, glyph — and the plate
            and overlay are exactly what this tile now draws in CSS, so drawing
            the frame as well would be a picture of a tile inside a tile. The
            useful side effect is that an unmet enemy puts **no shape id in the
            DOM at all**, which is a stronger form of the withholding this
            screen exists to enforce than sending the right frame was.
          */
          <span className="bestiary-tile__unknown" aria-hidden="true">
            ?
          </span>
        )}
      </button>
    </li>
  );
}

export function BestiaryScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const bestiary = useGameStore((s) => s.bestiary);
  /*
   * Which tile is locked into the window, and which is under the pointer.
   *
   * Only these two are React state — the card's *position* is written straight
   * to `style.transform` inside `CursorTip`, so sweeping the grid re-renders
   * once per tile crossed rather than once per pixel.
   */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<BestiaryRow | null>(null);
  if (activeScene !== 'Bestiary') return null;

  const entries = (bestiary?.entries ?? []) as BestiaryRow[];
  const knownCount = bestiary?.knownCount ?? 0;
  const total = bestiary?.total ?? 0;

  /*
   * The window opens on the first enemy, as the AS3 does — `selectedEnemy` is
   * seeded from `enemyButtonModelArray[0]`. Resolved rather than stored so a
   * selection cannot survive the roster changing under it; `null` only before
   * the scene has published.
   */
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0];

  return (
    <ScreenShell
      title="Enemies"
      titleClip="TitleEnemies"
      typeTitle
      nav="Enemies"
      className="screen--bestiary"
    >
      {entries.length === 0 ? (
        <p className="screen__hint">Loading…</p>
      ) : (
        <div className="bestiary">
          {/* The plate the roster sits on — `ScreenEnemies` draws its grid over
              one, and this port's grid takes the same ground. */}
          <div className="bestiary__board">
            <ul className="bestiary__grid">
              {entries.map((entry) => (
                <RosterTile
                  key={entry.id}
                  entry={entry}
                  selected={selected?.id === entry.id}
                  onSelect={() => setSelectedId(entry.id)}
                  onHover={setHovered}
                />
              ))}
            </ul>
          </div>

          <aside className="bestiary__panel" aria-label="Enemy details">
            <h2 className="bestiary__name">
              {selected?.known === true ? selected.displayName : '???'}
            </h2>
            <p className="bestiary__desc">
              {selected?.known === true ? selected.description : 'Not yet encountered.'}
            </p>

            {bestiary && <ViewControls view={bestiary.view} />}

            {/*
              The stats and the two resistance rows, side by side — `:224-296`
              puts the four numbers at `bgWindow.x + 4` and the two badge rows
              at `+ 206`, which is the same two columns.
            */}
            <div className="bestiary__readout">
              <StatBlock stats={selected?.stats} />
              <div className="bestiary__resists">
                {/*
                  The AS3 places these at fixed stage coordinates (`:377`
                  `x = 434 + i * 38`, `y = 348`/`408`) against a 640x480 stage.
                  Rule 7: those are frozen screen constants, not a layout, so
                  the port uses a flow row that scales with the window.
                */}
                <ResistanceRow label="Strengths" badges={selected?.strengths ?? []} />
                <ResistanceRow label="Weaknesses" badges={selected?.weaknesses ?? []} />
              </div>
            </div>

            <p
              className="bestiary__count"
              aria-label={`${knownCount} of ${total} enemies known`}
            >
              {knownCount} / {total} known
            </p>
          </aside>
        </div>
      )}

      {/* Mounted once, outside the grid, and portalled to `<body>` from there —
          a card per tile would be twenty of them. */}
      <CursorTip
        open={hovered !== null}
        contentKey={hovered?.id ?? null}
        className="cursor-tip--enemy"
      >
        {hovered !== null && (
          <>
            <p className="cursor-tip__title">
              {hovered.known ? hovered.displayName : '???'}
            </p>
            <p className="cursor-tip__objective">
              {hovered.known ? hovered.description : 'Not yet encountered.'}
            </p>
            {hovered.stats !== undefined && (
              <p className="cursor-tip__note">
                {hovered.stats.health} HP · {hovered.stats.damage} damage ·{' '}
                {hovered.stats.money}$
              </p>
            )}
          </>
        )}
      </CursorTip>
    </ScreenShell>
  );
}
