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
