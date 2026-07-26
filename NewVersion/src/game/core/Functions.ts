/**
 * Port of `SWFimported/scripts/Functions.as` (Core systems).
 *
 * The AS3 class extends Sprite but holds no state and has exactly one static
 * method, so it becomes a plain module rather than a class.
 */

/**
 * `Functions.formatNumber(number)` — groups digits with commas.
 *
 * Intended for non-negative integers (currency, scores, kill counts), which is
 * all the original ever passes it.
 *
 * ── Faithful, including two bugs ──────────────────────────────────────────
 * The AS3 walks the *string* backwards in 3-character chunks with no regard
 * for what those characters are, which misbehaves in two cases:
 *
 *   formatNumber(-123)   -> "-,123"    (the sign is left alone in a chunk)
 *   formatNumber(1234.5) -> "123,4.5"  (the decimal point is just a character)
 *
 * Both are reproduced deliberately. Grouping is a display path that feeds
 * saved strings and screenshots, and silently changing it would make ported
 * output disagree with the original for the same input. `Functions.test.ts`
 * pins both. If you decide the game should never show "-,123", fix it at the
 * call site by clamping, or change this and update the tests — but make it a
 * decision, not a drive-by.
 *
 * Note this is *not* `toLocaleString()`: that yields "1 234" in fr-FR and
 * "1.234" in de-DE. The original is always comma-grouped regardless of locale,
 * so the HUD uses this instead to stay faithful and deterministic.
 */
export function formatNumber(value: number): string {
  let remaining = String(value);
  let result = '';

  while (remaining.length > 3) {
    const chunk = remaining.slice(-3);
    remaining = remaining.slice(0, remaining.length - 3);
    result = `,${chunk}${result}`;
  }

  if (remaining.length > 0) {
    result = remaining + result;
  }

  return result;
}
