/**
 * A wordmark set in type — metallic gradient over an extruded body.
 *
 * Lifted out of `MainMenuScreen` in T167, when the shop's header wanted the
 * same treatment. Pasting the two-span stack would have made this another
 * "one rule, two copies"; `docs/AUDIT-2026-07.md` keeps the list of those.
 *
 * ── Why it is two copies of the same string ───────────────────────────────
 * `background-clip: text` requires `color: transparent`, and a `text-shadow`
 * on transparent text paints *through* the glyphs rather than behind them — so
 * the extrusion and the metal cannot live on one element. The lower copy
 * carries the body and owns the accessible name; the upper one carries the
 * gradient and is hidden from the tree, or the heading announces itself twice.
 *
 * **The size and position are the caller's**, supplied through `className`.
 * `.type-title` sets only the family, the weight and the depths — all in `em`,
 * so a wordmark keeps its proportions at any `font-size`. That split is what
 * lets the menu's 8.5rem logo and the shop's header share a definition.
 */
export function TypeTitle({
  text,
  as: Tag = 'h1',
  className,
}: {
  /** Rendered as given — the caps in the original are a CSS transform. */
  text: string;
  /** The heading level. The shop's header is not the page's only h1. */
  as?: 'h1' | 'h2';
  className?: string;
}): React.ReactElement {
  return (
    <Tag className={className ? `type-title ${className}` : 'type-title'}>
      <span className="type-title__solid">{text}</span>
      <span className="type-title__gloss" aria-hidden="true">
        {text}
      </span>
    </Tag>
  );
}
