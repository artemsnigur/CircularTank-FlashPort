/**
 * Which files a sync run should delete from `src/assets/`.
 *
 * ── What "prune" means here, and what it does not ─────────────────────────
 * **Not a manifest problem.** `src/assets/manifest.ts` and
 * `src/assets/audioManifest.ts` are hand-maintained lists, and nothing here
 * touches them. The gap is one directory below: `src/assets/` is a *copy* of
 * two tracked trees (`SWFimported/` and `assets-authored/`), `sync-assets.mjs`
 * only ever wrote into it, and `registry.ts:28` globs the directory **eagerly**
 * — so a file the sources no longer produce is still bundled, with no manifest
 * entry and nothing referencing it.
 *
 * ── The one failure mode the existing check cannot see ────────────────────
 * `registry.test.ts:218` already asserts every synced file exists in one of the
 * two source roots. That covers a rename, a re-encode and an upstream deletion,
 * because all three remove the name from **both** roots.
 *
 * It cannot see a **shape dropped from `CURATED_SHAPES`**: the file is still in
 * `SWFimported/shapes/`, so it is not a stray by that definition — while the
 * eager glob keeps shipping it. That is precisely the cost the curated set
 * exists to avoid, and it is the gap this closes.
 *
 * ── Why deleting by default is safe ───────────────────────────────────────
 * `src/assets/` is a build artifact: gitignored, and reproducible in full by
 * re-running the sync. Nothing here can destroy anything tracked. The prune set
 * is derived from **exactly** the set the copy loops write, so the authored
 * overlay survives by construction rather than by an exemption someone has to
 * remember to keep in step.
 *
 * Tooling only — no AS3 behaviour is involved and nothing here diverges from
 * the original.
 */

/**
 * The filenames a run will write into one destination folder.
 *
 * @param extracted names present in `SWFimported/<from>/`
 * @param authored  names present in `assets-authored/<to>/`
 * @param curated   the `CURATED_SHAPES` set, or null when the group is not curated
 * @returns the union, with the curated filter applied to the extracted half only
 */
export function plannedWrites(extracted, authored, curated) {
  const planned = new Set();
  for (const name of extracted) {
    // The curated filter applies to the extraction only. An authored file is
    // always written — it is there because someone put it there.
    if (curated && !curated.has(name)) continue;
    planned.add(name);
  }
  for (const name of authored) planned.add(name);
  return planned;
}

/**
 * Files in the destination that this run would not have written.
 *
 * Restricted to `exts` so the prune can never touch something the sync does not
 * own — a stray `.DS_Store`, an editor swap file, or a folder another tool
 * writes into the same tree.
 */
export function orphanedFiles(destNames, planned, exts) {
  return destNames
    .filter((name) => exts.some((ext) => name.toLowerCase().endsWith(ext)))
    .filter((name) => !planned.has(name))
    .sort();
}
