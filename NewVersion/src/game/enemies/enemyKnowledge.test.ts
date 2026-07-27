import { describe, expect, it } from 'vitest';
import { BESTIARY, INITIAL_KNOWN_ENEMIES } from './bestiaryData';
import {
  buildBestiaryListing,
  createInitialKnownEnemies,
  discoverEnemies,
  isEnemyKnown,
  knownBestiary,
  knownCount,
  toDisplayName,
  toEnemyId,
} from './enemyKnowledge';
import {
  decodeEnemyKnowledgeFields,
  encodeEnemyKnowledgeFields,
  KNOWN_ENEMIES_KEY,
} from './enemyKnowledgeSave';
import { getLevel, LEVELS } from '../levels/levelData';
import { SAVE_SLOT_FIELDS } from '../save/saveSchema';
import { buildSlotBody, EMPTY_SAVE_STRING, parseSlotFields, writeSlot } from '../save/saveString';

describe('bestiary data', () => {
  it('has all 20 enemy types', () => {
    expect(BESTIARY).toHaveLength(20);
  });

  it('gives every entry a unique id and a description', () => {
    const ids = BESTIARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of BESTIARY) expect(e.description.length, e.id).toBeGreaterThan(0);
  });

  it('spaces exactly the three multi-word display names', () => {
    const spaced = BESTIARY.filter((e) => e.displayName.includes(' ')).map((e) => e.id);
    expect(spaced.sort()).toEqual(['DamageAddict', 'GrapplingHook', 'ScaredGhost']);
  });

  it('unescapes the apostrophe in the Ghost description', () => {
    // AS3 writes "Can\'t be damaged when invisible."
    const ghost = BESTIARY.find((e) => e.id === 'Ghost');
    expect(ghost?.description).toBe("Can't be damaged when invisible.");
  });

  it('covers every enemy type that appears in the level tables', () => {
    const inLevels = new Set(LEVELS.flat().flatMap((l) => l.enemies.map((e) => e.type)));
    const inBestiary = new Set(BESTIARY.map((e) => e.id));
    for (const type of inLevels) expect(inBestiary.has(type), type).toBe(true);
  });

  it('has no display name containing a comma, which the save format splits on', () => {
    for (const e of BESTIARY) expect(e.displayName).not.toContain(',');
  });

  it('starts with only Basic known', () => {
    expect(INITIAL_KNOWN_ENEMIES).toEqual(['Basic']);
  });
});

describe('id / display name mapping', () => {
  it('rewrites the three compound names, matching the AS3', () => {
    expect(toDisplayName('ScaredGhost')).toBe('Scared Ghost');
    expect(toDisplayName('DamageAddict')).toBe('Damage Addict');
    expect(toDisplayName('GrapplingHook')).toBe('Grappling Hook');
  });

  it('leaves single-word names alone', () => {
    expect(toDisplayName('Basic')).toBe('Basic');
  });

  it('passes an unknown id through unchanged', () => {
    expect(toDisplayName('NotAnEnemy')).toBe('NotAnEnemy');
  });

  it('round-trips both directions', () => {
    for (const e of BESTIARY) expect(toEnemyId(toDisplayName(e.id))).toBe(e.id);
    expect(toEnemyId('Nope')).toBeUndefined();
  });
});

describe('discoverEnemies', () => {
  it('discovers nothing new in world 1 level 1, which is Basic only', () => {
    expect(getLevel(1, 1)?.enemies.map((e) => e.type)).toEqual(['Basic']);
    const result = discoverEnemies(createInitialKnownEnemies(), 1, 1);
    expect(result.newlyDiscovered).toEqual([]);
    expect(result.known).toEqual(['Basic']);
  });

  it('discovers Fast in world 1 level 2', () => {
    const result = discoverEnemies(createInitialKnownEnemies(), 1, 2);
    expect(result.newlyDiscovered).toEqual(['Fast']);
    expect(result.known).toEqual(['Basic', 'Fast']);
  });

  it('does not re-discover an enemy already known', () => {
    const once = discoverEnemies(createInitialKnownEnemies(), 1, 2);
    const twice = discoverEnemies(once.known, 1, 2);
    expect(twice.newlyDiscovered).toEqual([]);
    expect(twice.known).toEqual(once.known);
  });

  it('ignores the enemy level suffix — Basic2 still means Basic', () => {
    // Find a level containing a non-tier-1 Basic.
    let found: { world: number; level: number } | null = null;
    for (let w = 1; w <= LEVELS.length && !found; w += 1) {
      for (let l = 1; l <= LEVELS[w - 1].length && !found; l += 1) {
        const spec = getLevel(w, l);
        if (spec?.enemies.some((e) => e.type === 'Basic' && e.level !== '1')) {
          found = { world: w, level: l };
        }
      }
    }
    expect(found).not.toBeNull();

    const result = discoverEnemies(['Basic'], found!.world, found!.level);
    expect(result.known.filter((n) => n === 'Basic')).toHaveLength(1);
  });

  it('stores the spaced display name, not the id', () => {
    // Find a level containing one of the compound-named enemies.
    let found: { world: number; level: number } | null = null;
    for (let w = 1; w <= LEVELS.length && !found; w += 1) {
      for (let l = 1; l <= LEVELS[w - 1].length && !found; l += 1) {
        if (getLevel(w, l)?.enemies.some((e) => e.type === 'ScaredGhost')) {
          found = { world: w, level: l };
        }
      }
    }
    expect(found).not.toBeNull();

    const result = discoverEnemies(['Basic'], found!.world, found!.level);
    expect(result.known).toContain('Scared Ghost');
    expect(result.known).not.toContain('ScaredGhost');
  });

  it('does not mutate the list it was given', () => {
    const known = createInitialKnownEnemies();
    discoverEnemies(known, 1, 2);
    expect(known).toEqual(['Basic']);
  });

  it('handles an out-of-range level without throwing', () => {
    const result = discoverEnemies(['Basic'], 99, 99);
    expect(result.newlyDiscovered).toEqual([]);
    expect(result.known).toEqual(['Basic']);
  });

  it('discovers all 20 types across a full playthrough', () => {
    let known = createInitialKnownEnemies();
    for (let w = 1; w <= LEVELS.length; w += 1) {
      for (let l = 1; l <= LEVELS[w - 1].length; l += 1) {
        known = discoverEnemies(known, w, l).known;
      }
    }
    expect(knownCount(known)).toBe(20);
  });
});

describe('queries', () => {
  it('accepts either an id or a display name', () => {
    const known = ['Basic', 'Scared Ghost'];
    expect(isEnemyKnown(known, 'ScaredGhost')).toBe(true);
    expect(isEnemyKnown(known, 'Scared Ghost')).toBe(true);
    expect(isEnemyKnown(known, 'Ninja')).toBe(false);
  });

  it('returns unlocked entries in screen order', () => {
    const known = ['Ninja', 'Basic', 'Fast'];
    expect(knownBestiary(known).map((e) => e.id)).toEqual(['Basic', 'Fast', 'Ninja']);
  });
});

describe('save round trip', () => {
  it('emits the single field the schema declares for ScreenEnemies', () => {
    const fields = encodeEnemyKnowledgeFields(createInitialKnownEnemies());
    expect(fields).toHaveLength(1);

    const schemaKeys = SAVE_SLOT_FIELDS.filter((f) => f.owner === 'ScreenEnemies').map(
      (f) => f.key,
    );
    expect(fields.map((f) => f.key)).toEqual(schemaKeys);
  });

  it('round-trips a fresh profile', () => {
    const known = createInitialKnownEnemies();
    expect(decodeEnemyKnowledgeFields(encodeEnemyKnowledgeFields(known))).toEqual(known);
  });

  it('round-trips names containing spaces', () => {
    const known = ['Basic', 'Scared Ghost', 'Damage Addict', 'Grappling Hook'];
    expect(decodeEnemyKnowledgeFields(encodeEnemyKnowledgeFields(known))).toEqual(known);
  });

  it('round-trips a fully discovered bestiary', () => {
    const known = BESTIARY.map((e) => e.displayName);
    expect(decodeEnemyKnowledgeFields(encodeEnemyKnowledgeFields(known))).toEqual(known);
  });

  it('survives a trip through the save-string container', () => {
    const known = ['Basic', 'Grappling Hook'];
    const text = writeSlot(EMPTY_SAVE_STRING, 1, buildSlotBody(encodeEnemyKnowledgeFields(known)));
    expect(decodeEnemyKnowledgeFields(parseSlotFields(text, 1))).toEqual(known);
  });

  it('falls back to Basic when the field is absent', () => {
    expect(decodeEnemyKnowledgeFields([])).toEqual(['Basic']);
  });

  it('discards names not in the bestiary', () => {
    const decoded = decodeEnemyKnowledgeFields([
      { key: KNOWN_ENEMIES_KEY, value: 'Basic,Wyvern,Ninja' },
    ]);
    expect(decoded).toEqual(['Basic', 'Ninja']);
  });

  it('never decodes to an empty bestiary', () => {
    expect(decodeEnemyKnowledgeFields([{ key: KNOWN_ENEMIES_KEY, value: '' }])).toEqual(['Basic']);
    expect(decodeEnemyKnowledgeFields([{ key: KNOWN_ENEMIES_KEY, value: 'Wyvern' }])).toEqual([
      'Basic',
    ]);
  });
});


describe('buildBestiaryListing', () => {
  it('includes every entry, met or not', () => {
    const listing = buildBestiaryListing(['Basic']);
    expect(listing.entries).toHaveLength(BESTIARY.length);
    expect(listing.total).toBe(BESTIARY.length);
  });

  it('withholds the description of an unmet enemy entirely', () => {
    // Not blanked in the view — absent from the payload, so the string never
    // reaches the browser and no CSS mistake can reveal it.
    const listing = buildBestiaryListing(['Basic']);
    const unmet = listing.entries.filter((e) => !e.known);

    expect(unmet.length).toBeGreaterThan(0);
    for (const entry of unmet) {
      expect(entry.description, entry.id).toBeUndefined();
    }
  });

  it('carries the description of a met enemy', () => {
    const listing = buildBestiaryListing(['Basic']);
    const basic = listing.entries.find((e) => e.id === 'Basic');
    expect(basic?.known).toBe(true);
    expect(basic?.description).toBe(BESTIARY.find((e) => e.id === 'Basic')?.description);
  });

  it('counts met entries, not the raw saved list', () => {
    // A save written by an older build can hold a name that is no longer a
    // bestiary entry. Counting the list length would push the numerator past
    // the denominator and render "21 / 20".
    const listing = buildBestiaryListing(['Basic', 'Not An Enemy']);
    expect(listing.knownCount).toBe(1);
    expect(listing.knownCount).toBeLessThanOrEqual(listing.total);
  });

  it('accepts the stored display-name form for the renamed three', () => {
    // knownEnemiesArray stores "Scared Ghost", not "ScaredGhost".
    const listing = buildBestiaryListing(['Basic', 'Scared Ghost']);
    expect(listing.entries.find((e) => e.id === 'ScaredGhost')?.known).toBe(true);
    expect(listing.knownCount).toBe(2);
  });

  it('reports a fresh profile as knowing exactly one', () => {
    expect(buildBestiaryListing(createInitialKnownEnemies()).knownCount).toBe(1);
  });
});
