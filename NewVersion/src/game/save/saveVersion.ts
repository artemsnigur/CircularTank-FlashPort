/**
 * The save-schema version, and what happens to a slot that predates it.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * A slot records progress as a table shaped like the campaign, plus a resume
 * point as a world/level pair. The redesign changed both: 9 worlds of 45
 * became 4 (`A98`), so a slot written before it describes a game that is not
 * there any more.
 *
 * Nothing about that is loud. `decodeLevelSelectFields` reshapes the progress
 * table to whatever the campaign now is, so the extra worlds are simply
 * dropped; the **resume point** is the sharp edge — `previousWorld: 7` points
 * at a world `getLevel` has no answer for, and the medals earned in worlds 5-9
 * vanish with no message. A player would open the game to find a campaign they
 * had finished half of, now unfinishable, and no explanation.
 *
 * ── Reset, not migrate ────────────────────────────────────────────────────
 * Decision `D-6`. A migration would have to decide what a world-7 clear means
 * in a four-world campaign, and every answer is invented — the levels are not
 * the same levels. The honest options were "reset" and "pretend", and pretending
 * would leave a player with medals for levels they have never seen.
 *
 * So a slot at the wrong version is treated as **empty**, which is a state the
 * game already handles everywhere: it is what a new player has.
 *
 * ── The version is stored, not inferred ───────────────────────────────────
 * It could be guessed — a progress table with nine worlds is obviously old —
 * but only until the next change that is not about world count. An explicit
 * field answers every future migration question with the same mechanism, and
 * costs one key in the slot.
 *
 * A slot with **no** version field is a pre-redesign save by definition:
 * nothing before this wrote one.
 */

/** Slot field holding the schema version. */
export const SAVE_VERSION_KEY = 'sv';

/**
 * What this build writes and will read back.
 *
 * 1 was every save written before the campaign redesign — implicitly, since
 * none of them carry the field. 2 is the four-world campaign.
 *
 * **Bump this whenever a change makes an older slot describe a game that no
 * longer exists**, not for every schema addition: a new field that decodes to
 * a sensible default needs no bump, because an old slot is still a true
 * description of a game that can be played.
 */
export const SAVE_SCHEMA_VERSION = 2;

/** The version a slot with no `sv` field is from. */
export const UNVERSIONED_SAVE = 1;

/**
 * The version a slot claims, or `UNVERSIONED_SAVE`.
 *
 * A field that is present but not a number is treated as unversioned rather
 * than trusted: a corrupt slot should be discarded, and the discard path is the
 * one that already exists.
 */
export function slotVersion(fields: readonly { key: string; value: string }[]): number {
  const raw = fields.find((f) => f.key === SAVE_VERSION_KEY)?.value;
  if (raw === undefined) return UNVERSIONED_SAVE;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : UNVERSIONED_SAVE;
}

/**
 * Whether a slot's contents can be used as they stand.
 *
 * Strict equality rather than `>=`. A slot from a *newer* build describes
 * fields this one does not understand, and reading it would silently drop
 * them — which is worse for the player than starting fresh on an older build,
 * because it destroys the newer save on the next write.
 */
export function isReadableVersion(version: number): boolean {
  return version === SAVE_SCHEMA_VERSION;
}
