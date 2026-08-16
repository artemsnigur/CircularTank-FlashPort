/**
 * Renders the generated `sprite-shapes.mjs` source.
 *
 * Split out of `gen-sprite-shapes.mjs` so the emitted text is written as plain
 * template literals in a real file rather than assembled through a shell
 * heredoc. Three escaping slips in one session — a stray apostrophe closing a
 * string twice, and a `\n` that became a real newline inside a string literal —
 * all came from generating JavaScript through another language's quoting. The
 * parser half is the interesting code; this half just has to be unambiguous.
 */

/**
 * @param {Map<number, { frameCount: number, places: number[] }>} sprites
 * @param {Set<number>} shapeIds every id defined by a DefineShape tag
 * @returns {string} the full text of `scripts/lib/sprite-shapes.mjs`
 */
export function renderSpriteShapes(sprites, shapeIds) {
  const ids = [...sprites.keys()].sort((a, b) => a - b);

  // Fixed 16.16 divided by 65536 gives long decimals for thirds (1.3333333…);
  // 6 places is well past SVG raster precision and keeps the generated file
  // diff-stable.
  const round = (n) => Number(n.toFixed(6));

  const rows = ids.map((id) => {
    const { frameCount, places, matrices } = sprites.get(id);
    // Placement order, duplicates collapsed — see the header note below.
    const unique = [...new Set(places)];
    const matrixEntries = unique
      .filter((shapeId) => matrices.has(shapeId))
      .map((shapeId) => {
        const { scaleX, scaleY, tx, ty, rotate0, rotate1 } = matrices.get(shapeId);
        // Six numbers, always, rather than a shorter form when the tail is
        // zero: a consumer destructuring `[sx, sy, tx, ty]` off a
        // two-element row would read `undefined` as an offset and place the
        // layer at NaN, which renders as nothing at all.
        return (
          `${shapeId}: [${round(scaleX)}, ${round(scaleY)}, ${round(tx)}, ${round(ty)}, ` +
          `${round(rotate0)}, ${round(rotate1)}]`
        );
      });
    const scaleField =
      matrixEntries.length > 0 ? `, matrices: { ${matrixEntries.join(', ')} }` : '';

    // The per-frame picture as a list of layers, emitted only when it varies.
    // A clip whose every frame draws the same thing is not an animation, and a
    // 30-long array of identical entries would suggest otherwise.
    const { timeline } = sprites.get(id);
    const asText = timeline.map((layers) => `[${layers.join(', ')}]`);
    const varies = new Set(asText).size > 1;
    const timelineField = varies ? `, timeline: [${asText.join(', ')}]` : '';

    return (
      `  ${id}: { frameCount: ${frameCount}, places: [${unique.join(', ')}]` +
      `${scaleField}${timelineField} },`
    );
  });

  const placed = new Set(ids.flatMap((id) => sprites.get(id).places));
  const shapeCount = [...placed].filter((id) => shapeIds.has(id)).length;
  const otherCount = placed.size - shapeCount;
  const sortedShapeIds = [...shapeIds].sort((a, b) => a - b);

  return `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run sprites:data
 *
 * Which character ids each DefineSprite places, from the SWF tag table of
 * SWFimported/scripts/_assets/assets.swf. See scripts/gen-sprite-shapes.mjs
 * for why this mapping is not in the JPEXS extraction and has to be derived.
 *
 * -- \`places\` is not "shapes" --------------------------------------------
 * A placement can name a **shape**, a **nested sprite**, or another character
 * type entirely (text, button, bitmap). Of the ${placed.size} ids placed across this
 * file, ${shapeCount} are shapes and ${otherCount} are not. Filter with \`SHAPE_IDS\`, or use
 * \`shapeIdsForSprites\` which does it for you — treating every placement as a
 * shape is wrong for ${otherCount} of them.
 *
 * \`places\` is placement order with duplicates collapsed, **not a frame
 * timeline**. \`frameCount\` is the timeline length and is usually larger:
 * sprite 236 (BulletBomb) places 10 shapes across 16 frames, and reading
 * either number as the other is wrong in both directions.
 */

/**
 * \`matrices\` is the **first** placement matrix seen for each shape, as
 * \`[scaleX, scaleY, tx, ty, rotate0, rotate1]\`. Absent when the placement
 * carried no matrix, which means identity.
 *
 * **Scale** is how the original tells apart clips that share a shape: sprite
 * 264 (Cannon) places shape 215 at 0.5 x 1.333 while 217 (MiniGun) places the
 * same shape at 1 x 1.
 *
 * **Translation** is how a clip positions one layer against another, and it is
 * why this row grew from two numbers to six in T154. \`ButtonUpgrades\` (456)
 * places its plate at the origin and its label at \`(100, 20)\`; with only the
 * scale half, the two stack concentrically and the button looks plausible and
 * is wrong. 537 placements across 87 sprites carry one.
 *
 * **Rotation** is rare — 281 placements across 6 sprites — and is carried
 * rather than asserted away, so a consumer that meets one can decide for
 * itself instead of silently drawing it upright.
 *
 * @type {Readonly<Record<number, { frameCount: number, places: number[], matrices?: Record<number, [number, number, number, number, number, number]> }>>}
 */
export const SPRITE_SHAPES = Object.freeze({
${rows.join('\n')}
});

/**
 * Every id defined by a DefineShape or DefineMorphShape tag.
 *
 * Taken from the tag table, not from which \`shapes/*.svg\` files happen to
 * exist — so a dropped export shows up as a mismatch rather than quietly
 * reclassifying a shape as something else.
 */
export const SHAPE_IDS = Object.freeze([${sortedShapeIds.join(', ')}]);

const SHAPE_ID_SET = new Set(SHAPE_IDS);

/**
 * The shape ids these sprites place, followed through nested sprites.
 *
 * Recursive because a placement can name another sprite; stopping at the first
 * level would under-report art for any composed clip. \`seen\` guards against
 * cycles, which a malformed file can contain and which would otherwise hang
 * whatever is calling this.
 */
export function shapeIdsForSprites(spriteIds) {
  const found = new Set();
  const seen = new Set();
  const stack = [...spriteIds];

  while (stack.length > 0) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);

    for (const place of SPRITE_SHAPES[id]?.places ?? []) {
      if (SHAPE_ID_SET.has(place)) found.add(place);
      else if (SPRITE_SHAPES[place]) stack.push(place);
    }
  }

  return found;
}
`;
}
