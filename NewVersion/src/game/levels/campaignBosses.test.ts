import { describe, expect, it } from 'vitest';

import { LEVELS } from './levelData';
import type { LevelSpec } from './levelData';

interface Flat extends LevelSpec {
  world: number;
  level: number;
  /** 1-based index across the whole campaign. */
  g: number;
}

const flat: Flat[] = LEVELS.flatMap((world, w) =>
  world.map((spec, l) => ({ ...spec, world: w + 1, level: l + 1, g: w * 45 + l + 1 })),
);

const bossEntries = (spec: LevelSpec) => spec.enemies.filter((e) => e.level === 'B');
const bossCount = (spec: LevelSpec) => bossEntries(spec).reduce((n, e) => n + e.count, 0);
const bossLevels = flat.filter((s) => s.mode === 'Boss');
const where = (s: Flat) => `${s.world}-${s.level}`;

/** Where each type first appears at all, as a global level index. */
const debutAt = new Map<string, number>();
for (const spec of flat) {
  for (const e of spec.enemies) if (!debutAt.has(e.type)) debutAt.set(e.type, spec.g);
}

/** Where each type first appears **as a boss**. */
const bossDebutAt = new Map<string, number>();
for (const spec of bossLevels) {
  for (const e of bossEntries(spec)) if (!bossDebutAt.has(e.type)) bossDebutAt.set(e.type, spec.g);
}

describe('the first boss encounter', () => {
  /**
   * One boss, and it is the whole point of the level.
   *
   * 1-5 is the first boss a player ever meets and has to teach the encounter:
   * the health wipe, that it does not fall to one magazine, that ordinary
   * enemies keep arriving around it. Two at once teaches none of that.
   */
  it('is a single boss', () => {
    const first = bossLevels[0];
    expect(where(first)).toBe('1-5');
    expect(bossCount(first)).toBe(1);
    expect(bossEntries(first)).toHaveLength(1);
  });

  it('is the only level that fields one, and every later one ramps', () => {
    // The counterpart: "one boss" is an opening, not the rule. Without this,
    // a generator that produced a single boss everywhere would pass above.
    const singles = bossLevels.filter((s) => bossCount(s) === 1);
    expect(singles.map(where)).toEqual(['1-5']);
    expect(bossCount(bossLevels[bossLevels.length - 1])).toBeGreaterThan(1);
  });
});

describe('a multi-boss level fields a mixed roster', () => {
  it('never stacks three or more of one type', () => {
    const stacked = bossLevels.flatMap((s) =>
      bossEntries(s)
        .filter((e) => e.count > 2)
        .map((e) => `${where(s)}: ${e.count}x ${e.type}`),
    );
    expect(stacked).toEqual([]);
  });

  it('gives every level past the first at least two different bosses', () => {
    const uniform = bossLevels
      .filter((s) => bossCount(s) > 1 && bossEntries(s).length < 2)
      .map(where);
    expect(uniform).toEqual([]);
  });

  it('widens the roster as the count grows, rather than repeating', () => {
    /*
     * The property that separates "a mix" from "two types doubled up": a level
     * fielding N bosses uses at least ceil(N / 2) distinct types, because no
     * type may appear more than twice. Asserted as the arithmetic so it stays
     * true whatever the boss schedule becomes.
     */
    for (const spec of bossLevels) {
      const count = bossCount(spec);
      expect(bossEntries(spec).length, `${where(spec)} fields ${count}`).toBeGreaterThanOrEqual(
        Math.ceil(count / 2),
      );
    }

    // ...and the biggest levels really are the widest, which a cap alone would
    // not give: five distinct bosses on the deepest fights.
    const widest = Math.max(...bossLevels.map((s) => bossEntries(s).length));
    expect(widest).toBe(5);
  });

  it('names each type once per level, not twice in two rows', () => {
    for (const spec of bossLevels) {
      const types = bossEntries(spec).map((e) => e.type);
      expect(new Set(types).size, where(spec)).toBe(types.length);
    }
  });
});

describe('a new enemy gets its boss shown', () => {
  it('makes a boss of every type in the campaign', () => {
    // The rule this exists for: a type that never appears as a boss never
    // shows its mechanic at full strength.
    const missing = [...debutAt.keys()].filter((type) => !bossDebutAt.has(type));
    expect(missing).toEqual([]);
    expect(bossDebutAt.size).toBe(20);
  });

  /**
   * Showcased at the next boss level that has room, never later.
   *
   * "The very next boss level" is the rule, and it has one honest exception
   * built into the design: 1-5 has a single slot while three types have
   * already debuted, so two of them queue for 1-9. Nothing is dropped — the
   * queue carries them — so what is asserted is that a type is never held past
   * the first boss level with a **free slot** after its debut.
   */
  it('never holds a type past the first boss level with room for it', () => {
    const late: string[] = [];

    // Walk the campaign the way the generator does, replaying the queue.
    const pending: string[] = [];
    for (const spec of flat) {
      for (const e of spec.enemies) {
        if (debutAt.get(e.type) === spec.g && !pending.includes(e.type)) pending.push(e.type);
      }
      if (spec.mode !== 'Boss') continue;

      const fielded = new Set<string>(bossEntries(spec).map((e) => e.type));
      const slots = bossEntries(spec).length;
      // Everything queued that could have fitted must be here.
      for (const type of pending.slice(0, slots)) {
        if (!fielded.has(type)) late.push(`${type} missing from ${where(spec)}`);
      }
      pending.splice(0, slots);
    }

    expect(late).toEqual([]);
    expect(pending, 'nothing is still waiting at the end').toEqual([]);
  });

  it('puts a Ghost boss on 1-32, four levels after Ghost arrives', () => {
    /*
     * The worked example, pinned because it is the case the rule was written
     * for: Ghost debuts on 1-28 as an ordinary enemy and 1-32 is the next boss
     * level, so that is where its boss belongs — mixed with older types, not
     * alone.
     */
    expect(debutAt.get('Ghost')).toBe(28);

    const level = flat.find((s) => where(s) === '1-32')!;
    expect(level.mode).toBe('Boss');
    expect(bossEntries(level).map((e) => e.type)).toContain('Ghost');
    expect(bossEntries(level).length, 'mixed, not a Ghost-only fight').toBeGreaterThan(1);
  });
});
