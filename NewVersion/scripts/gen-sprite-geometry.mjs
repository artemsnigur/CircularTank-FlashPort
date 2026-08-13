#!/usr/bin/env node
/**
 * Generates `src/assets/spriteGeometry.ts` — where a piece of art's
 * **registration point** sits, and how far each weapon's barrel reaches.
 *
 *   node scripts/gen-sprite-geometry.mjs [--check]
 *
 * ── The thing this file exists to carry ───────────────────────────────────
 * Flash positions a clip by its **registration point**, not by its centre.
 * Phaser positions a sprite by its origin, which defaults to the centre. For
 * art whose registration *is* the centre the two agree and nothing is owed —
 * which is why this went unnoticed: 33 of the 44 particle shapes are centred.
 *
 * The muzzle flare is not. Shapes 1108/1114/1119 (Medium/Big/Small, frame 1)
 * all have their registration at **local x = 0, the flare's flat base**, and
 * extend forward from there. Drawn centred, half the flare sits *behind* the
 * muzzle, inside the tank — which is exactly the "buried in the hull" the flare
 * was reported for. Drawn from its registration, the base lands on the barrel
 * tip and the flare reads as coming out of the gun.
 *
 * ── Barrel reach ──────────────────────────────────────────────────────────
 * `Tank.as:63` does `addChild(this.tower)` and never sets x/y, so the turret's
 * registration point is the tank's centre. The barrel therefore reaches
 * `svgWidth - registrationX` design units along the turret's bearing, per
 * weapon, straight off the shape's own bounds.
 *
 * Measured: eleven of the twelve turrets reach 10.5 and the Gummy Bear reaches
 * 11.3, because most of these clips are the same circle with a different stub.
 * The Magic Cannon is the outlier at 17.9. **That near-uniformity is a finding,
 * not a reason to hard-code 10.5** — it is why `PartGameArea.as:3962` could get
 * away with a flat `10` for every weapon, and it is measured here rather than
 * assumed so the Gummy Bear and the Magic Cannon are right too.
 *
 * ── Inputs ────────────────────────────────────────────────────────────────
 *   scripts/lib/tank-tower-frames.mjs   weapon -> frame, from the AS3's chain
 *   scripts/lib/sprite-shapes.mjs       sprite -> shapes, generated from the SWF
 *   SWFimported/shapes/<id>.svg         the shape's bounds and registration
 *
 * The registration point is JPEXS's `<g transform="matrix(1,0,0,1,tx,ty)">` —
 * the translation that maps shape-local (0,0) onto the exported canvas.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPRITE_SHAPES } from './lib/sprite-shapes.mjs';
import { TOWER_FRAME_BY_WEAPON } from './lib/tank-tower-frames.mjs';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const shapesDir = join(projectRoot, '..', 'SWFimported', 'shapes');
const args = { check: process.argv.includes('--check') };

/** `TankTower` — `TANK_SYMBOLS.tower`. Its 12 frames are the 12 weapons. */
const TOWER_SPRITE = 18;

/**
 * Particle clips whose frame-1 shape is off-centre but must **not** be
 * re-anchored, with the reason. Each entry is a claim that has been checked.
 *
 * `Lock` places shape 843 at a translation of (-65, -47) — read straight off
 * the SWF's PlaceObject matrix. `SPRITE_SHAPES` keeps only the *scale* half of
 * that matrix, so this generator cannot see the translation, and an anchor
 * derived from the registration alone would move the clip by the amount the
 * translation was there to cancel. Left centred, exactly as it draws today.
 */
const ANCHOR_EXCLUDED = new Map([[843, 'sprite 1059 places it at a non-zero translation']]);

/** The particle clips, and their frame-1 shape. Mirrors `particleArt.ts`. */
const PARTICLE_FRAME_ONE = new Map(
  Object.entries({
    MuzzleFlareBig: 1114,
    MuzzleFlareMedium: 1108,
    MuzzleFlareSmall: 1119,
    Lock: 843,
  }),
);

/** Authored bounds and registration point, straight off the SVG root. */
function shapeGeometry(shapeId) {
  const file = join(shapesDir, `${shapeId}.svg`);
  if (!existsSync(file)) return null;

  const svg = readFileSync(file, 'utf8');
  const width = /\bwidth="([\d.]+)px"/.exec(svg);
  const height = /\bheight="([\d.]+)px"/.exec(svg);
  // The first group is JPEXS's registration translation. Only the translation
  // pair is captured; the four leading terms are the identity in every shape
  // this reads, and a non-identity one would be a different problem entirely.
  const reg = /<g transform="matrix\(([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+)\)"/.exec(
    svg,
  );
  if (!width || !height || !reg) return null;

  const scaleX = Number(reg[1]);
  const scaleY = Number(reg[4]);
  const skewA = Number(reg[2]);
  const skewB = Number(reg[3]);
  if (scaleX !== 1 || scaleY !== 1 || skewA !== 0 || skewB !== 0) return null;

  return {
    width: Number(width[1]),
    height: Number(height[1]),
    registrationX: Number(reg[5]),
    registrationY: Number(reg[6]),
  };
}

const round = (n) => Number(n.toFixed(4));

const problems = [];

// ── Turrets ───────────────────────────────────────────────────────────────
const towerShapes = SPRITE_SHAPES[TOWER_SPRITE]?.places ?? [];
if (towerShapes.length !== 12) {
  problems.push(`sprite ${TOWER_SPRITE} places ${towerShapes.length} shapes, expected 12`);
}

const towers = [];
for (const [weapon, frame] of Object.entries(TOWER_FRAME_BY_WEAPON)) {
  const shape = towerShapes[frame - 1];
  if (shape === undefined) {
    problems.push(`${weapon}: frame ${frame} is not placed by sprite ${TOWER_SPRITE}`);
    continue;
  }
  const geometry = shapeGeometry(shape);
  if (!geometry) {
    problems.push(`${weapon}: shape ${shape} has no readable svg geometry`);
    continue;
  }

  towers.push({
    weapon,
    shape,
    width: round(geometry.width),
    height: round(geometry.height),
    originX: round(geometry.registrationX / geometry.width),
    originY: round(geometry.registrationY / geometry.height),
    // The barrel runs along +x in shape-local coordinates, so its tip is
    // whatever is left of the canvas beyond the registration point.
    barrelReach: round(geometry.width - geometry.registrationX),
  });
}

// ── Particle anchors ──────────────────────────────────────────────────────
/** Off-centre by more than this fraction of the canvas is worth anchoring. */
const CENTRED_TOLERANCE = 0.02;

const anchors = [];
for (const [clip, shape] of PARTICLE_FRAME_ONE) {
  const geometry = shapeGeometry(shape);
  if (!geometry) {
    problems.push(`${clip}: shape ${shape} has no readable svg geometry`);
    continue;
  }
  const originX = geometry.registrationX / geometry.width;
  const originY = geometry.registrationY / geometry.height;
  const centred =
    Math.abs(originX - 0.5) <= CENTRED_TOLERANCE && Math.abs(originY - 0.5) <= CENTRED_TOLERANCE;

  if (centred) continue;
  if (ANCHOR_EXCLUDED.has(shape)) continue;

  anchors.push({ clip, shape, originX: round(originX), originY: round(originY) });
}

if (problems.length > 0) {
  console.error(problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}

const towerRows = towers
  .map(
    (t) =>
      `  '${t.weapon}': { shape: ${t.shape}, width: ${t.width}, height: ${t.height}, ` +
      `originX: ${t.originX}, originY: ${t.originY}, barrelReach: ${t.barrelReach} },`,
  )
  .join('\n');

const anchorRows = anchors
  .map((a) => `  ${a.clip}: { originX: ${a.originX}, originY: ${a.originY} },`)
  .join('\n');

const excludedRows = [...ANCHOR_EXCLUDED]
  .map(([shape, why]) => ` *   shape ${shape} — ${why}`)
  .join('\n');

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run sprite-geometry:data
 *
 * Registration points and barrel reach, derived from the shape bounds in
 * SWFimported/shapes/*.svg. See scripts/gen-sprite-geometry.mjs for why
 * registration is not the same as centre, and why that matters here.
 */

/** One turret's authored geometry, in design units. */
export interface TowerGeometry {
  /** \`assets.swf\` shape id — the frame \`TankTower\` shows for this weapon. */
  shape: number;
  /** Authored canvas size. Drawing this square distorts nine of the twelve. */
  width: number;
  height: number;
  /**
   * The registration point as an origin fraction. \`Tank.as:63\` adds the
   * turret at (0,0), so this point is the tank's centre — set it as the
   * sprite's origin and the turret pivots where the original pivots.
   */
  originX: number;
  originY: number;
  /**
   * Distance from the tank's centre to the barrel tip, along the turret's
   * bearing. This is where a muzzle flare belongs.
   */
  barrelReach: number;
}

/**
 * Per-weapon turret geometry.
 *
 * Eleven of the twelve reach 10.5 and the Gummy Bear reaches 11.3; the Magic
 * Cannon is the outlier at 17.9. The near-uniformity is why
 * \`PartGameArea.as:3962\` could spawn every muzzle flare at a flat 10 — that
 * value is the barrel tip to within half a unit for almost every weapon.
 */
export const TOWER_GEOMETRY: Readonly<Record<string, TowerGeometry>> = Object.freeze({
${towerRows}
});

/**
 * Where a particle clip's registration point sits, as an origin fraction.
 *
 * **Only entries that are not centred appear here**, and today that is exactly
 * the three muzzle flares: their registration is the flare's flat base, at
 * local x = 0. Everything absent from this table draws centred, which is what
 * its registration already is.
 *
 * Deliberately excluded, each checked rather than assumed:
${excludedRows}
 */
export const PARTICLE_ANCHORS: Readonly<Record<string, { originX: number; originY: number }>> =
  Object.freeze({
${anchorRows}
});
`;

const outPath = join(projectRoot, 'src/assets/spriteGeometry.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('spriteGeometry.ts is out of date. Run: npm run sprite-geometry:data');
    process.exit(1);
  }
  console.log('spriteGeometry.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote spriteGeometry.ts — ${towers.length} turrets, ${anchors.length} off-centre particle anchors.`,
);
