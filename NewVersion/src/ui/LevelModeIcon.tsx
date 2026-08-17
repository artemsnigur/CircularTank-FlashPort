/**
 * A level's mode, as a shape — `IconStar`, `IconFlag`, `IconShield`,
 * `IconTower`, `IconBoss`.
 *
 * ── Why it exists, and why it is drawn rather than extracted ──────────────
 * `ScreenLevelSelect.as:876-896` picks one of five clips by the level's mode
 * and uses it for **both** jobs on a tile: the mode badge (`iconMode`, `:925`)
 * and every earned medal (`:874`). So a Flag level's medals are little flags,
 * not stars — which is the detail this port dropped and `A34` recorded as
 * unported until now.
 *
 * The shapes are authored SVG rather than the extracted clips, for the reason
 * the rest of this screen moved to CSS in T170: an extracted clip is a fixed
 * size with no `viewBox` (`A27`), and these have to render legibly at 8px
 * inside a 40px tile on a small laptop and at 35px inside a 176px tile on a
 * 4K display. A path scales; a 20px drawing does not.
 *
 * **They are representations, not traces.** Each is drawn to read at a glance
 * as the thing the original names — a flag, a shield, a keep, a skull — and is
 * not measured against the SWF artwork. Recorded in `A34`.
 *
 * `currentColor` throughout, so the medal tiers and the badge colour it from
 * CSS rather than needing five more variants.
 */
/**
 * One 24x24 path per mode.
 *
 * `Normal` is the star, which is also the fallback: `:876` assigns
 * `new IconStar()` before testing the mode and only replaces it on a match, so
 * an unrecognised mode draws a star there too.
 */
const PATHS: Record<string, string> = {
  // Five-point star.
  Normal: 'M12 2.6l2.85 6.1 6.65.9-4.85 4.6 1.2 6.6L12 17.7l-5.85 3.1 1.2-6.6L2.5 9.6l6.65-.9z',
  // Pole with a pennant — the flag levels' collectible.
  Flag: 'M5.6 2h1.9v20H5.6zM8.4 2.9h11.2l-3.3 4.6 3.3 4.6H8.4z',
  // Heraldic shield, as Defense levels guard a point.
  Defense: 'M12 2.2l8.2 3v6.1c0 5.2-3.5 9.3-8.2 11.4-4.7-2.1-8.2-6.2-8.2-11.4V5.2z',
  // A crenellated keep — the Tower levels' own structure.
  Tower: 'M4.6 22V9.2l2.6-2.6V3h2.2v2.2h5.2V3h2.2v3.6l2.6 2.6V22z',
  // Skull, for the boss.
  Boss:
    'M12 2C7.2 2 3.7 5.4 3.7 9.9c0 2.6 1.1 4.5 2.7 5.7V22h2.2v-2.1h1.6V22h3.6v-2.1h1.6V22h2.2v-6.4' +
    'c1.6-1.2 2.7-3.1 2.7-5.7C20.3 5.4 16.8 2 12 2z',
};

/** The two eyes on the skull, which a single path cannot hollow out cleanly. */
const BOSS_EYES: [number, number][] = [
  [9.2, 10.2],
  [14.8, 10.2],
];

export function LevelModeIcon({
  mode,
  className,
  title,
}: {
  /**
   * `string`, not `LevelMode`: the mode crosses the bus as a plain string on
   * `levels:listed`, so narrowing here would only push a cast one level out.
   * An unrecognised value is not an error — see `PATHS`.
   */
  mode: string;
  className?: string;
  /**
   * An accessible name, when this icon is the only thing saying which mode a
   * level is. Omitted on the medals, where the tile's own label already does.
   */
  title?: string;
}): React.ReactElement {
  const path = PATHS[mode] ?? PATHS.Normal;

  return (
    <svg
      className={className ? `mode-icon ${className}` : 'mode-icon'}
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path d={path} fill="currentColor" />
      {mode === 'Boss' &&
        BOSS_EYES.map(([cx, cy]) => (
          // Punched in the tile's own colour rather than as a hole: the medals
          // sit on a gradient, and a `fill-rule` cut-out would show the plate
          // through them at a different brightness on every row.
          <circle key={cx} cx={cx} cy={cy} r="1.9" fill="rgb(0 0 0 / 55%)" />
        ))}
    </svg>
  );
}
