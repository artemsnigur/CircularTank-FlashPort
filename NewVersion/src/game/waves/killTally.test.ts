/**
 * The kill tally and the payout must be once-per-enemy.
 *
 * `removeEnemy` had its double-removal guard placed above `registerEnemyKilled`
 * — the line it was added to protect — leaving the payout and the kill count
 * outside it. A double call then no-oped the wave counter while paying twice
 * and counting twice: the HUD looked correct and the summary read 2x.
 *
 * The scene is too heavy to instantiate, so what is pinned is the shape:
 * everything once-per-enemy sits behind one guard, taken first.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

function removeEnemyBody(): string {
  const start = source.indexOf('private removeEnemy(');
  const rest = source.slice(start);
  const end = rest.indexOf('\n  private ', 1);
  return end === -1 ? rest : rest.slice(0, end);
}

describe('removeEnemy', () => {
  const body = removeEnemyBody();

  it('exists', () => {
    expect(body).toContain('private removeEnemy(');
  });

  it('takes its guard before anything with a side effect', () => {
    const guard = body.indexOf('indexOf(enemy)');
    expect(guard).toBeGreaterThan(-1);

    // Matched against calls, not prose — the comment above the guard names
    // `registerEnemyKilled` and would otherwise match first.
    for (const marker of ['this.currency +=', 'this.kills += 1', 'registerEnemyKilled(this.']) {
      const at = body.indexOf(marker);
      expect(at, `${marker} must sit after the guard`).toBeGreaterThan(guard);
    }
  });

  it('counts the kill and pays out together', () => {
    // Both are once-per-enemy and belong to the same branch; splitting them is
    // how they drifted apart.
    expect(body).toMatch(/if \(payMoney\)[\s\S]*this\.kills \+= 1[\s\S]*this\.currency \+=/);
  });
});

describe('the tally has exactly one writer', () => {
  it('is incremented in one place only', () => {
    // Four call sites used to increment before calling removeEnemy, so a
    // double call double-counted while the removal itself no-oped.
    expect(source.match(/this\.kills \+= 1/g) ?? []).toHaveLength(1);
  });

  it('is reset per level', () => {
    expect(source).toMatch(/this\.kills = 0/);
  });

  it('has no caller incrementing it around a removal', () => {
    expect(source).not.toMatch(/this\.kills \+= 1;\s*\n\s*this\.removeEnemy/);
  });
});
