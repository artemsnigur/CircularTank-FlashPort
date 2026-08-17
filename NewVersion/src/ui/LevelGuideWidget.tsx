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
 * never starts anything. It moves a pointer that level select later reads.
 *
 * ── T168: the chrome is CSS, and so are the controls ──────────────────────
 * Every button here used to draw an extracted clip — `Arrow`, the three
 * presets, the auto-select toggle and the info icon, each a stack of SVG
 * shapes in a fixed 18-22px box. At the sizes this screen now runs at, a 20px
 * control on a 2K display is not small on purpose, it is just small.
 *
 * So the art is gone and the controls are type and borders: chevrons drawn
 * with a rotated border, presets and the toggle as labelled pills. They scale
 * with `--aside` like everything else in that column.
 *
 * **`levelGuideArt.ts` is still generated and still checked** by
 * `data:check` — it is simply no longer rendered. Left in place rather than
 * deleted because it is a pipeline, not a file: regenerating it costs nothing
 * and the day someone wants the original's iconography back, the alternative
 * is re-deriving eight frame numbers from the SWF. Recorded as `A31`.
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
import { siteCorner } from '../game/ui/infoTextSites';
import { previewForLevel } from '../game/levels/levelPreview';
import { useInfoText } from './useInfoText';

/**
 * One step control.
 *
 * The chevron is a bordered square rotated 45 degrees — two borders of a box,
 * so it stays a crisp hairline at any size, where a glyph would be at the
 * mercy of the font and a background image would need its own asset.
 */
function Step({
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
      className={`guide-step guide-step--${direction.toLowerCase()}`}
      disabled={!enabled}
      aria-label={`${direction === 'Left' ? 'Previous' : 'Next'} ${axis.toLowerCase()}`}
      onClick={() => GameEvents.emit('ui:level-guide-step', { axis, direction })}
    >
      <span className="guide-step__chevron" aria-hidden="true" />
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

/** Short enough for a three-across row; the tooltip carries the full sentence. */
const PRESET_LABEL: Record<'Previous' | 'Upcoming' | 'Last', string> = {
  Previous: 'Prev',
  Upcoming: 'Next',
  Last: 'Last',
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
      {PRESET_LABEL[type]}
    </button>
  );
}

/** One stepper row — a chevron, a labelled figure, a chevron. */
function Row({
  axis,
  value,
  canLeft,
  canRight,
}: {
  axis: 'World' | 'Level';
  value: number;
  canLeft: boolean;
  canRight: boolean;
}): React.ReactElement {
  return (
    <div className="guide-row">
      <Step axis={axis} direction="Left" enabled={canLeft} />
      <span className="guide-readout">
        <span className="guide-readout__label">{axis}</span>
        <span className="guide-readout__value">{value}</span>
      </span>
      <Step axis={axis} direction="Right" enabled={canRight} />
    </div>
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
      <h3 className="level-guide__title">Level guide</h3>

      <div className="level-guide__rows">
        <Row
          axis="World"
          value={guide.selectedWorld}
          canLeft={guide.canStep.worldLeft}
          canRight={guide.canStep.worldRight}
        />
        <Row
          axis="Level"
          value={guide.selectedLevel}
          canLeft={guide.canStep.levelLeft}
          canRight={guide.canStep.levelRight}
        />
      </div>

      <div className="level-guide__presets">
        {(['Previous', 'Upcoming', 'Last'] as const).map((type) => (
          <Preset key={type} type={type} active={guide.presetActive[type]} />
        ))}
      </div>

      <div className="level-guide__foot">
        <button
          type="button"
          className={`guide-auto${guide.autoSelect ? ' guide-auto--on' : ''}`}
          aria-pressed={guide.autoSelect}
          aria-label="Auto-select level"
          onClick={() => GameEvents.emit('ui:level-guide-autoselect', { on: !guide.autoSelect })}
          {...autoHover}
        >
          <span className="guide-auto__dot" aria-hidden="true" />
          Auto
        </button>

        <span className="guide-info" aria-hidden="true" {...infoHover}>
          ?
        </span>
      </div>
    </section>
  );
}
