/**
 * Every dev affordance is tagged and recorded.
 *
 * There was no removal record before this. Eleven dev aids sat across seven
 * files marked only by prose, and two of them said "remove with the other dev
 * aids" — referring to a list that did not exist. That is how a temporary
 * affordance ships: not by anyone deciding to keep it, but by nobody being able
 * to enumerate what "the others" were.
 *
 * The mechanism is a greppable `DEV-AID:` tag plus this list. Adding an
 * affordance without recording it fails here; removing one without updating the
 * list fails too. Same partition shape as `MISC_WITHOUT_EFFECT` — the list is
 * load-bearing rather than decorative.
 *
 * **Every one of these must also be behind `import.meta.env.DEV`.** The tag is
 * the inventory; the gate is what actually keeps them out of a build.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/** One entry per tagged affordance, as `file → what it does`. */
const DEV_AIDS: Readonly<Record<string, readonly string[]>> = {
  'src/game/scenes/GameplayScene.ts': [
    'margin-style cycle (G)',
    'kill the tank (K)',
    'fund the shop (M)',
    'top-up amount',
    'equipped + owned secondary via ?secondary=',
    'equipped + owned primary via ?primary=',
    'force the tutorial on via ?tutorial=1',
    'tutorial panel render dump',
    'force the tutorial on for a completed profile',
    // Both added with the countdown (T67), for `npm run look -- --countdown`.
    // They are a pair: one reproduces the pre-countdown state, the other is
    // how the difference is measured. Remove them together.
    'hold the countdown flag false via ?countdown=0',
    'spawn placement recorder',
    // T214: the achievement flags, the weapon name they key off, and the hp
    // the clean-run rule reads. Added because 'KABOOM! never unlocks' could
    // not be diagnosed by reading — every layer was individually correct.
    'achievement flag probe',
    // T216: live bullet kinds. The cake burst fired on every hit instead of
    // on the kill, and no test could see it — the rule is in the collision
    // loop, which cannot be instantiated.
    'cake fragment probe',
    'cake impact and burst counters',
    'ground hazard count and depth',
    'particle count and untextured fallbacks',
    // T220: the impact burst is pure and fully tested, and every remaining
    // question about it is wiring — is it called, on what, and where does it
    // land. An empty burst is recorded too, since that is the right answer for
    // fire and penetrating rounds and is otherwise indistinguishable from the
    // call never happening.
    'last impact burst placement',
    // T69: the sweep aimed at a hard-coded screen point. This is how it finds
    // the tank instead.
    'live tank screen position',
    // T112: `--walls` compares each enemy against its own previous sample, and
    // the projection is distance-sorted and sliced, so the array index is not a
    // stable identity. Keying on it reported zero wall contacts for a boss that
    // sat against a wall for 152 consecutive samples.
    'stable per-enemy ids for the debug projection',
    // T121: the muzzle flare's lifetime is 2 frames, shorter than a screenshot
    // round-trip, so "where does the flare sit" had no photographable answer.
    // Lengthens the flare and nothing else — position and anchor are geometric.
    'hold the muzzle flare on screen via ?flarehold=<frames>',
    // T125: the A/B for enemy separation. Comparing against an older commit
    // would compare two builds and two runs; this compares one build with one
    // flag moved.
    'disable enemy separation via ?separation=0',
    'every enemy as a bare circle, for the separation A/B',
    'separation effects applied per frame, for reachability',
    'force two bosses together via ?bosspair=x,y',
    'the last boss collision and its audibility verdict',
    // T147: the minimap shipped and did not appear. Every reason it could be
    // invisible is a separate field — position, visibility, alpha, depth, fills
    // painted, and the camera transform — which is what turned "it is not
    // rendering" into "it renders at (464, 224) at double size" in one run.
    'the minimap`s live state and camera transform',
    'fills painted by the last minimap draw',
    // T148: the markers have the same "renders, but where?" failure mode the
    // minimap had, plus two gates that can each silently produce nothing — the
    // room-size check and `outsideWindow`. The projection reports both inputs
    // alongside the counts, which is what separated "no enemy is off screen"
    // from "the pool never grows" in one run.
    'off-screen marker counts, gates and first placement',
  ],
  // T114: a persisted damage-flash tint, which no unit test could see (nothing
  // constructs an `Enemy`) and no screenshot could reliably read.
  'src/game/entities/Enemy.ts': [
    'live sprite tint, for --hits',
    'drop an enemy at a world point, for --boss-collision',
  ],
  'src/game/levels/devLevels.ts': ['QA levels for enemy behaviour'],
  // T100: a fresh profile knows only `Basic`, which has no resistances, so the
  // bestiary's 16 typed badges cannot be photographed without one.
  'src/game/scenes/BestiaryScene.ts': ['reveal the whole bestiary via ?known=all'],
  // `LevelSelectScreen.tsx` left this list in T172. The dev level jump is
  // gone — it took the whole body at short viewports and pushed SELECT
  // WORLD off the screen. The enemies screen still reaches every level.
  'src/game/audio/queueHistory.ts': ['sound queue history'],
  'src/game/audio/SoundManager.ts': [
    'queue history record',
    'queue history enable',
    'queue history publish',
    'queue history music',
    'queue history loops',
  ],
};

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe('dev aids are enumerable', () => {
  const tagged = new Map<string, number>();
  for (const file of sourceFiles('src')) {
    const count = (readFileSync(file, 'utf8').match(/DEV-AID:/g) ?? []).length;
    if (count > 0) tagged.set(file.split(sep).join('/'), count);
  }

  it('every tagged file is in the list, and every listed file is tagged', () => {
    expect(new Set(tagged.keys())).toEqual(new Set(Object.keys(DEV_AIDS)));
  });

  it('the tag count matches the recorded entries per file', () => {
    for (const [file, count] of tagged) {
      expect(count, `${file} has ${count} DEV-AID tags`).toBe(DEV_AIDS[file].length);
    }
  });

  it('the whole set is small enough to remove in one pass', () => {
    // Not a style rule. The reason these are recorded is that they must all go
    // before release, and a set nobody can enumerate never does.
    const total = Object.values(DEV_AIDS).reduce((n, xs) => n + xs.length, 0);
    // 11 until T39, which added the sound queue history and its hooks in
    // `SoundManager`: record, enable, and the publish that hands the harness
    // the manifest name list. 23 since T67 — `?countdown=0` and the spawn
    // recorder, the pair `--countdown` needs to measure a placement change
    // that no screenshot and no unit test can see. 24 since T69 — the live
    // tank position, without which the sweep fires at where the tank was.
    // 25 since T100 — `?known=all`, without which the bestiary shows one met
    // enemy that happens to have no resistances at all, so `--resistances`
    // would photograph the empty badge twice and call it coverage.
    // 26 since T112 — stable per-enemy ids, without which `--walls` compares
    // one enemy's sample against another's and cannot see a wall contact at
    // all. A `WeakMap` in the scene rather than a field on `Enemy`, so removing
    // it at release takes nothing in the game with it.
    // 27 since T114 — the enemy sprite tint accessor.
    // 28 since T121 — `?flarehold=<frames>`. The muzzle flare lives 2 frames,
    // which is shorter than a screenshot round-trip, so "where is the flare"
    // had no photographable answer at all until this. It changes the flare's
    // duration and nothing else — position and anchor have no time term.
    // 34 since T126 — `?bosspair=x,y`, the audibility verdict it is read
    // through, and `Enemy.placeAt`. `BossCollision` needs two live bosses
    // touching, and a natural collision is always near the tank and so always
    // on screen — which drives one side of the gate and never the other.
    // 31 since T125 — `?separation=0`, the unsorted `bodies` projection, and
    // the per-frame applied-effect counter. The third exists because the A/B
    // aggregate moved the wrong way and could not distinguish "wired and weak"
    // from "not wired at all".
    // `?separation=0` and the unsorted `bodies` projection,
    // the pair the separation A/B needs: one to turn the subsystem off, one to
    // see every enemy rather than the distance-sorted top 24.
    // 36 since T147 — the minimap's live state and its fill counter. The panel
    // shipped in T146 and did not appear; these turned "it is not rendering"
    // into "it renders at (464, 224) at double size, because a
    // `setScrollFactor(0)` object is placed in camera-pixel space" in a single
    // run, which no amount of reading the scene had managed.
    // 36 since T172 — the level jump went with the screen's dev section.
    // It was 37 from T148, when the off-screen markers added their counts.
    // 33 since T182, which removed the money top-up: the button, the scene's
    // `grantMoney` and the `ui:dev-grant-money` event, three tags in three
    // files. Taken out at the maintainer's request rather than because it was
    // broken — a dev affordance that ships behind `import.meta.env.DEV` still
    // shows up in every development session, which is where it was unwanted.
    // 38 with T220's impact-burst probe.
    expect(total).toBe(38);
  });
});
