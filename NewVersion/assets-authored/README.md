# Authored assets

Assets **we** made, as against `SWFimported/`, which is the read-only JPEXS
extraction and the source being ported from.

They live here for two reasons:

- `SWFimported/` is pristine by contract and the pre-commit hook enforces it.
  A file we authored is not an extraction, and putting it there would both
  break that rule and misrepresent where it came from.
- `NewVersion/src/assets/` is gitignored — it is a build product of
  `npm run assets:sync`. Anything only stored there is untracked, so a fresh
  clone would reference an asset that does not exist.

`assets:sync` copies from here as well as from `SWFimported/`, into the same
`src/assets/` tree, so nothing downstream needs to know the difference.

## Naming

Keep the SWF library ID prefix when the asset derives from an extracted file:
`351_upscale.png` is a 4x upscale of `351.png`. The registry test requires the
prefix to name a file that actually exists, and derived files must be declared
in its `DERIVED_ASSETS` set — the `<id>_<Name>` convention otherwise means the
suffix is a symbol name from `symbols.csv`, which a derived file has no claim
to.

## Replacing an extracted file outright

`assets:sync` copies `SWFimported/` first and this directory second, so an
authored file with the **same name** wins. That is deliberate — the sync prints
a `note ... replaces the extracted file` line for every such case, so a
replacement is visible rather than silent.

### `fonts/49_Main_font2_Arial.ttf`

The JPEXS export of this font has a format-4 `cmap` whose last two segments
both end at `0xFFFF`. The spec requires strictly increasing end codes with a
single terminal `0xFFFF`, so Chrome's sanitiser rejected the whole font:

    Failed to decode downloaded font: 49_Main_font2_Arial.ttf
    OTS parsing error: cmap: Out of order end range (65535 <= 65535)

Every screen then rendered `--font-body` in a system fallback. Nothing failed
and nothing was logged except a `console.warn` from the runtime font self-test.

The copy here is the same font with its `cmap` recompiled — 34 malformed
segments become 131 correct ones, and **all 2730 codepoints are preserved**.
The name is identical on purpose: the `@font-face` rule, the registry and the
"never rename an extracted file" rule all stay untouched.

Reproduce with Python and `fonttools`:

```bash
pip install fonttools
python scripts/repair-font-cmap.py assets-authored/fonts/49_Main_font2_Arial.ttf
```

The script asserts both halves of the repair — that no end code is
non-increasing afterwards, and that no real codepoint was lost — so a silent
partial fix is not a possible outcome. `src/assets/fontIntegrity.test.ts` pins
the result against the shipped file, and also pins that the *extracted* file is
still broken, so the test cannot quietly become a tautology if it is ever fixed
upstream.
