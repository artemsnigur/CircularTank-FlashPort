/**
 * Builds the 180-level campaign from the AS3 tables and the design constants.
 *
 * ── What is derived and what is invented ──────────────────────────────────
 * Almost everything is derived. Mode, boss count, room size, theme and the
 * debut schedule come from `campaign-design.mjs` and `campaignThemes.ts`; enemy
 * count, spawn interval and the flag numbers come from the **source level** —
 * the old level at the same fraction of the campaign — so the redesign inherits
 * the original's pacing rather than a curve someone drew.
 *
 * The one genuinely new thing is the **composition**: which types are in a wave
 * and at what tier. The original's rows cannot be reused, because the roster at
 * a given point is different — the debuts have been compressed, so level 40 now
 * has nine types available where the old level 90 had six.
 *
 * ── Deterministic, and why that matters more than it looks ────────────────
 * Every choice runs off a seeded generator keyed to the level's global index,
 * so the same input produces the same 180 levels forever. Without that,
 * `levels:data:check` — which regenerates and diffs — would fail on every run,
 * and the campaign would quietly change under players on each rebuild.
 *
 * It is **not** `PM_PRNG`. That generator is reproducibility-critical for
 * background prop placement and is seeded per level from the data; this is a
 * build-time convenience with no runtime counterpart, so borrowing it would
 * only invite someone to think the two are related.
 */

/** mulberry32 — small, fast, and good enough for choosing enemy types. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Weighted draw of `count` distinct items, without replacement. */
function pickWeighted(items, weights, count, random) {
  const pool = items.map((item, i) => ({ item, weight: weights[i] }));
  const picked = [];

  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((n, p) => n + p.weight, 0);
    let roll = random() * total;
    let index = pool.length - 1;
    for (let i = 0; i < pool.length; i += 1) {
      roll -= pool[i].weight;
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    picked.push(pool[index].item);
    pool.splice(index, 1);
  }
  return picked;
}

/**
 * Splits `total` into `parts` positive counts that sum to exactly `total`.
 *
 * The exactness is the point: `totalEnemies` is the kill target and the sum of
 * the wave, and a level whose parts do not add up to its target cannot be
 * finished. Built by taking rounded shares and giving the remainder to the
 * first entry, so the arithmetic closes by construction rather than by luck.
 */
function splitCount(total, parts, random) {
  if (parts <= 1) return [total];

  // Shares in [0.7, 1.3] of an even split, so waves are uneven without any
  // entry collapsing to a token one or two.
  const weights = Array.from({ length: parts }, () => 0.7 + random() * 0.6);
  const sum = weights.reduce((a, b) => a + b, 0);

  const counts = weights.map((w) => Math.max(1, Math.round((total * w) / sum)));
  let drift = total - counts.reduce((a, b) => a + b, 0);

  // Push the rounding error onto the largest entries, one at a time, never
  // below 1.
  for (let i = 0; drift !== 0 && i < parts * 4; i += 1) {
    const at = i % parts;
    if (drift > 0) {
      counts[at] += 1;
      drift -= 1;
    } else if (counts[at] > 1) {
      counts[at] -= 1;
      drift += 1;
    }
  }
  return counts;
}

/**
 * Highest tier a type may appear at, given how long it has been around.
 *
 * A type that debuted two levels ago showing up at tier 3 reads as a difficulty
 * spike with no cause, so tiers unlock with familiarity: tier 2 after 8 levels,
 * tier 3 after 20. The numbers are a judgement — the AS3 has no rule of this
 * kind, it simply hand-authored every row.
 */
function tierCeiling(levelsSinceDebut) {
  if (levelsSinceDebut >= 20) return 3;
  if (levelsSinceDebut >= 8) return 2;
  return 1;
}

/**
 * How many of one type may stand on a boss level.
 *
 * Two, and it is a cap rather than a target: "never three or four of the exact
 * same boss" is the rule, and a level that fields ten identical bosses is one
 * fight repeated rather than an encounter. Reached only when the roster cannot
 * supply enough distinct types to give every slot its own.
 */
const MAX_PER_BOSS_TYPE = 2;

/**
 * Distinct boss types a level will use before it starts doubling up.
 *
 * Five. Every boss is a row in the level-select panel, and a ten-boss level
 * with ten distinct types is ten rows before the support even starts — so past
 * five the level doubles rather than widening. Five different bosses is
 * already more variety than the original ever showed (its maximum was one
 * type, whatever the count).
 */
const MAX_BOSS_TYPES = 5;

/**
 * The boss roster for one level: which types, and how many of each.
 *
 * Three rules, in priority order, and the first is the one that must not be
 * traded away:
 *
 *   1. **Showcase.** Every type that has debuted since the last boss level
 *      appears here as a boss. A new enemy's boss variant is how its mechanic
 *      gets shown at full strength, and skipping it means a type can go the
 *      whole campaign without one. Anything that does not fit stays queued for
 *      the next boss level rather than being dropped.
 *   2. **Variety.** Remaining slots go to distinct types, newest-weighted, up
 *      to `MAX_BOSS_TYPES`.
 *   3. **Doubling, last.** Only once the level is out of distinct types, and
 *      never past `MAX_PER_BOSS_TYPE`.
 *
 * `pending` is **mutated** — the types it consumes are gone from the caller's
 * queue. That is deliberate: the queue is what carries an unshowcased debut
 * forward, so consuming and carrying have to be the same operation.
 */
function bossRoster(slots, roster, pending, weights, random) {
  const chosen = [];

  // 1. Oldest debut first, so the earliest unshown type is showcased soonest
  //    and 1-5's single slot goes to the simplest enemy the player has met.
  while (pending.length > 0 && chosen.length < Math.min(slots, MAX_BOSS_TYPES)) {
    chosen.push(pending.shift());
  }

  // 2. Fill with types this level is not already fielding as a boss.
  const remaining = roster.filter((t) => !chosen.includes(t));
  const remainingWeights = remaining.map((t) => weights[roster.indexOf(t)]);
  const want = Math.min(slots, MAX_BOSS_TYPES) - chosen.length;
  if (want > 0) chosen.push(...pickWeighted(remaining, remainingWeights, want, random));

  // 3. Counts. One each, then a second pass, and no third — so a level short of
  //    types doubles up rather than tripling.
  const counts = chosen.map(() => 1);
  let placed = chosen.length;
  for (let pass = 1; pass < MAX_PER_BOSS_TYPE && placed < slots; pass += 1) {
    for (let i = 0; i < counts.length && placed < slots; i += 1) {
      counts[i] += 1;
      placed += 1;
    }
  }

  // Only reachable if the roster is smaller than `slots / MAX_PER_BOSS_TYPE`,
  // which the campaign's schedule never produces — world 1 has seven types by
  // its five-boss levels. Asserted rather than silently under-filling, because
  // a level that spawns fewer bosses than its quota can never be completed:
  // `isWaveComplete` waits for `bossAmountKilled >= bossAmount`.
  if (placed !== slots) {
    throw new Error(`boss roster placed ${placed} of ${slots} from ${roster.length} types`);
  }

  return chosen.map((type, i) => ({ type, level: 'B', count: counts[i] }));
}

/** Picks a tier from the world's mix, capped by familiarity. */
function pickTier(mix, ceiling, random) {
  const weights = [mix.t1, mix.t2, mix.t3].slice(0, ceiling);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let roll = random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return String(i + 1);
  }
  return String(weights.length);
}

/**
 * The whole campaign.
 *
 * @param as3Flat  the 405 AS3 rows, flat and in order
 * @param design   `campaign-design.mjs`
 * @param themeFor `(world, level) => theme`
 * @param introOrder the 20 enemy types in debut order
 * @param tierMix  `(world) => { t1, t2, t3 }` shares, from the old worlds it replaces
 */
export function buildCampaign({ as3Flat, design, themeFor, introOrder, tierMix }) {
  const {
    WORLDS,
    PER_WORLD,
    INTRO_LEVELS,
    modeFor,
    bossesFor,
    roomFor,
    varietyAt,
    sourceLevelFor,
  } = design;

  // level key -> the type debuting there, and the level each type debuted on.
  const debutAt = new Map();
  const debutLevel = new Map();
  {
    let n = 0;
    for (let world = 1; world <= WORLDS; world += 1) {
      for (const level of INTRO_LEVELS[world]) {
        const type = introOrder[n];
        debutAt.set(`${world}-${level}`, type);
        debutLevel.set(type, (world - 1) * PER_WORLD + level);
        n += 1;
      }
    }
    if (n !== introOrder.length) {
      throw new Error(`intro schedule places ${n} types, expected ${introOrder.length}`);
    }
  }

  /** Nearest AS3 Flag level at or before `index`, for flag counts and money. */
  const flagSource = (index) => {
    for (let i = index; i >= 0; i -= 1) if (as3Flat[i].mode === 'Flag') return as3Flat[i];
    return as3Flat.find((l) => l.mode === 'Flag');
  };

  const worlds = [];
  const roster = [];

  /**
   * Types that have debuted but not yet appeared as a boss.
   *
   * Carried **across worlds**, not reset per world: a debut late in world 1 is
   * showcased on the next boss level whichever world that falls in, and a
   * queue that emptied at a world boundary would silently drop it.
   */
  const pendingShowcase = [];

  for (let world = 1; world <= WORLDS; world += 1) {
    const levels = [];
    const mix = tierMix(world);

    for (let level = 1; level <= PER_WORLD; level += 1) {
      const g = (world - 1) * PER_WORLD + level;
      const random = rng(g * 2654435761);

      const debut = debutAt.get(`${world}-${level}`);
      if (debut) {
        roster.push(debut);
        // Queued for the next boss level, which must field its boss variant.
        pendingShowcase.push(debut);
      }

      const mode = modeFor(world, level);
      const bosses = bossesFor(world, level);
      const [roomWidth, roomHeight] = roomFor(world, level);
      const src = as3Flat[sourceLevelFor(g) - 1];

      // How many ordinary types this wave fields. A boss level's own row takes
      // an entry, so its support is narrower and capped below the entry limit.
      // A boss level's support is narrower than an ordinary level's, and
      // narrower still than it was: the bosses themselves now take up to five
      // rows, so two support types is what fits under
      // `MAX_BOSS_LEVEL_ENTRIES`. The fight is the bosses; the support is
      // there to stop the arena being empty between them.
      const wanted = mode === 'Boss'
        ? Math.min(roster.length, 2)
        : varietyAt(world, level, roster.length);

      // Recent types are likelier, which is what "new enemies appear more
      // often" buys — but every type keeps a real weight, so world 4 still
      // fields Basic and the roster does not silently retire behind the player.
      const weights = roster.map((_, i) => 1 + i * 0.6);
      let chosen = pickWeighted(roster, weights, wanted, random);

      // A type debuting here must be in its own debut wave. Swapped in rather
      // than appended, so the variety target is still exact.
      if (debut && !chosen.includes(debut)) chosen[chosen.length - 1] = debut;
      chosen = [...new Set(chosen)];

      const enemies = [];
      let totalEnemies = src.totalEnemies;

      if (mode === 'Boss') {
        // Enough ordinary enemies to still be a level around the bosses; the
        // AS3's own boss levels run 19-37 total.
        totalEnemies = Math.max(src.totalEnemies, bosses + 16);
        enemies.push(...bossRoster(bosses, roster, pendingShowcase, weights, random));
      }

      const support = totalEnemies - (mode === 'Boss' ? bosses : 0);
      const counts = splitCount(support, chosen.length, random);

      chosen.forEach((type, i) => {
        const since = g - (debutLevel.get(type) ?? g);
        enemies.push({
          type,
          level: pickTier(mix, tierCeiling(since), random),
          count: counts[i],
        });
      });

      levels.push({
        roomWidth,
        roomHeight,
        mode,
        upgradeLimit: src.upgradeLimit,
        theme: themeFor(world, level),
        seed: src.seed,
        totalEnemies: enemies.reduce((n, e) => n + e.count, 0),
        spawnInterval: src.spawnInterval,
        enemies,
        flagCount: mode === 'Flag' ? flagSource(sourceLevelFor(g) - 1).flagCount : 0,
        flagMoney: mode === 'Flag' ? flagSource(sourceLevelFor(g) - 1).flagMoney : 0,
      });
    }
    worlds.push(levels);
  }

  return worlds;
}
