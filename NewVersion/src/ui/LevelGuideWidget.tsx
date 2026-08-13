/**
 * The level guide — `LevelGuide.as`, on the shop screen.
 *
 * ── It lives here because the original puts it here ───────────────────────
 * `ScreenUpgrades.as:324` constructs it and `:631-634` adds it at (258, 348).
 * That is the only instantiation in the source, and it reads oddly until you
 * see why: the shop is where you spend money, and what you should spend it on
 * depends on which level you are about to play.
 *
 * **In the original that reason was partly the level's upgrade limit, which the
 * Info tooltip printed. This port neither enforces nor shows it** — divergence
 * `A11`, a design decision. The tooltip is five lines here, six there.
 *
 * The name suggests a level *picker*, and it is not one: pressing these buttons
 * never starts anything. It moves a pointer that level select later reads
 * (pass (e)).
 *
 * ── Rendered from the scene's numbers, never recomputed ───────────────────
 * Bounds, per-arrow enablement and per-preset match all arrive on
 * `level-guide:changed`. This component does no arithmetic over the progress
 * table: those bounds are *counts* (`levelGuide.ts`), they differ from the
 * unlock rule on a non-contiguous table, and a second implementation in the
 * view is how the results overlay's next-level maths went wrong once.
 */
import { useGameStore } from '../state/gameStore';
import { GameEvents } from '../game/events/GameEvents';
import { shapeUrl } from '../assets/registry';
import { LEVEL_GUIDE_CLIPS } from '../game/levels/levelGuideArt';
import { siteCorner } from '../game/ui/infoTextSites';
import { previewForLevel } from '../game/levels/levelPreview';
import { useInfoText } from './useInfoText';
import type { LevelGuideClip } from '../game/levels/levelGuideArt';

/** Draws one clip frame as its stack of shapes. */
function Clip({
  clip,
  frame,
  size,
}: {
  clip: LevelGuideClip;
  frame: number;
  size: number;
}): React.ReactElement {
  const layers = clip.frames[frame - 1] ?? clip.frames[0];
  return (
    <span className="guide-clip" style={{ width: size, height: size }}>
      {layers.map((shape) => (
        <img key={shape} src={shapeUrl(`${shape}.svg`)} alt="" aria-hidden="true" />
      ))}
    </span>
  );
}

/**
 * `ButtonLevelGuideArrow.setIdleImage` (`:240-248`).
 *
 * `gotoAndStop(1 + valueToAdd)` when disabled and `2 + valueToAdd` when live,
 * where `valueToAdd` is 0 for Left and 4 for Right — so the eight frames are
 * four states per direction, and the two directions are *different artwork*,
 * not one sprite flipped.
 */
function arrowFrame(direction: 'Left' | 'Right', enabled: boolean): number {
  const valueToAdd = direction === 'Right' ? 4 : 0;
  return (enabled ? 2 : 1) + valueToAdd;
}

function Arrow({
  axis,
  direction,
  enabled,
}: {
  axis: 'World' | 'Level';
  direction: 'Left' | 'Right';
  enabled: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      className="guide-arrow"
      disabled={!enabled}
      aria-label={`${direction === 'Left' ? 'Previous' : 'Next'} ${axis.toLowerCase()}`}
      onClick={() => GameEvents.emit('ui:level-guide-step', { axis, direction })}
    >
      <Clip clip={LEVEL_GUIDE_CLIPS.Arrow} frame={arrowFrame(direction, enabled)} size={18} />
    </button>
  );
}

/** `ButtonLevelGuideSelect.as:44-56` — one fixed string per preset. */
const PRESET_TOOLTIP: Record<'Previous' | 'Upcoming' | 'Last', string> = {
  Previous: 'Select Previous Level\n\nThe level you have just played.',
  Upcoming:
    'Select Upcoming Level\n\nThe level after the level you played previously. ' +
    "If you didn't win the previous level, the level guide assumes you are going to play it again.",
  Last: 'Select Last Level\n\nThe last selectable level in the last selectable world.',
};

function Preset({
  type,
  active,
}: {
  type: 'Previous' | 'Upcoming' | 'Last';
  active: boolean;
}): React.ReactElement {
  const hover = useInfoText({
    text: PRESET_TOOLTIP[type],
    ...siteCorner('ButtonLevelGuideSelect.as:81'),
  });
  return (
    <button
      type="button"
      className={`guide-preset${active ? ' guide-preset--on' : ''}`}
      aria-pressed={active}
      aria-label={`Select ${type.toLowerCase()} level`}
      onClick={() => GameEvents.emit('ui:level-guide-preset', { type })}
      {...hover}
    >
      {/* `:156-166` — frame 2 is the hover art and frame 3 the pressed state. */}
      <Clip clip={LEVEL_GUIDE_CLIPS[type]} frame={active ? 3 : 1} size={22} />
    </button>
  );
}

export function LevelGuideWidget(): React.ReactElement | null {
  const guide = useGameStore((s) => s.levelGuide);
  const difficulty = useGameStore((s) => s.difficulty);

  // Hooks run before the early return: the info tooltip is built either way and
  // simply carries an empty request until there is a guide to describe.
  const preview = guide
    ? previewForLevel(guide.selectedWorld, guide.selectedLevel, difficulty)
    : null;

  const infoHover = useInfoText({
    text: preview?.summary ?? '',
    ...siteCorner('ButtonLevelGuideInfo.as:64'),
    enemyRows: preview?.rows,
  });

  // `ButtonLevelGuideAutoSelect.as:60`/`:64` — the same sentence either way,
  // with the current state named first. The only stateful tooltip in the port.
  const autoHover = useInfoText({
    text:
      `Auto Select Level (${guide?.autoSelect ? 'Enabled' : 'Disabled'})\n` +
      '(Enabled Recommended)\n\n' +
      'Automatically selects the upcoming level for the level guide and the level select screen.',
    ...siteCorner('ButtonLevelGuideAutoSelect.as:38'),
  });

  if (!guide) return null;

  return (
    <section className="level-guide" aria-label="Level guide">
      {/*
        ── The panel chrome is the design system's, not the extracted art ──
        `BackgroundLevelGuide` (symbol 1434) is a 148x84 plate plus two 67.5x8.6
        strips backing the two text rows. It is synced and pinned in
        `levelGuideArt.ts`, and deliberately not drawn here, for two reasons:

        1. This widget sits on a screen the T92-T96 redesign moved wholesale to
           the design-system palette. Dropping one panel of Flash chrome into
           the middle of it would look like an unported patch.
        2. The two strips are positioned by `PlaceObject` matrices, and
           `gen-sprite-shapes.mjs` discards translation — it keeps scale only,
           because that is what told four weapon clips apart. Their offsets were
           measured for the projectile and badge clips and are zero; these have
           **not** been measured, so drawing them centred would be a guess.

        The buttons keep their extracted art: arrows, presets, the auto-select
        toggle and the info icon are iconography with no design-system
        equivalent, and their frames carry real state.
      */}
      <div className="level-guide__rows">
        <div className="level-guide__row">
          <Arrow axis="World" direction="Left" enabled={guide.canStep.worldLeft} />
          <span className="level-guide__value">World {guide.selectedWorld}</span>
          <Arrow axis="World" direction="Right" enabled={guide.canStep.worldRight} />
        </div>
        <div className="level-guide__row">
          <Arrow axis="Level" direction="Left" enabled={guide.canStep.levelLeft} />
          <span className="level-guide__value">Level {guide.selectedLevel}</span>
          <Arrow axis="Level" direction="Right" enabled={guide.canStep.levelRight} />
        </div>
      </div>

      <div className="level-guide__buttons">
        {(['Previous', 'Upcoming', 'Last'] as const).map((type) => (
          <Preset key={type} type={type} active={guide.presetActive[type]} />
        ))}

        <button
          type="button"
          className={`guide-auto${guide.autoSelect ? ' guide-auto--on' : ''}`}
          aria-pressed={guide.autoSelect}
          aria-label="Auto-select level"
          onClick={() =>
            GameEvents.emit('ui:level-guide-autoselect', { on: !guide.autoSelect })
          }
          {...autoHover}
        >
          {/* `:75-92` — frames 3/4 are the enabled pair, 1/2 the disabled pair. */}
          <Clip
            clip={LEVEL_GUIDE_CLIPS.AutoSelect}
            frame={guide.autoSelect ? 3 : 1}
            size={22}
          />
        </button>

        <span className="guide-info" {...infoHover}>
          <Clip clip={LEVEL_GUIDE_CLIPS.Info} frame={1} size={20} />
        </span>
      </div>
    </section>
  );
}
