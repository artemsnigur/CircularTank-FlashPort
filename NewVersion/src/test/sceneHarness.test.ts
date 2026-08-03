/**
 * The four assertions that could only prove a spelling, now proving behaviour.
 *
 * Each block below replaces a source-text check flagged during T1-T4. The
 * originals are gone rather than kept alongside — a shape check that duplicates
 * a behavioural one is not extra safety, it is a second thing to update and a
 * reason not to read the first.
 *
 * What is *retained* in each case is a single narrow source assertion covering
 * the one line this harness genuinely cannot reach: that `GameplayScene` hands
 * the seam the right argument. Those live beside the behaviour they guard, and
 * say so.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAME_MS, SceneHarness, harnessEnemy } from './sceneHarness';
import { createExplosion } from '../game/weapons/explosions';
import { createHazard, iceFreezes } from '../game/weapons/groundHazard';
import type { BulletState } from '../game/weapons/bullets';

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

const bullet = (over: Partial<BulletState> = {}): BulletState => ({
  x: 300,
  y: 200,
  xVel: 20,
  yVel: 0,
  rotation: 0,
  radius: 7,
  damage: 10,
  explosion: false,
  explosionRadius: 0,
  ...over,
});

const iceBlast = (over: Record<string, unknown> = {}) =>
  createExplosion({
    x: 0,
    y: 0,
    radius: 120,
    damage: 20,
    type: 'Ice',
    smallSound: false,
    effectTime: 200,
    effectDamage: 0,
    ...over,
  });

/* ────────────────────────────────────────────────────────────────────────
 * T4 gap 1 — "reads the rect from the live camera every frame"
 * ──────────────────────────────────────────────────────────────────────── */
describe('the bounce rect is live, not captured at spawn', () => {
  it('bounces where the camera is now, not where it was when the round was fired', () => {
    // The assertion the source check could not make. The round is fired with
    // the view at 0; the view then scrolls right while it is in flight. A rect
    // captured at spawn would let it sail past 640 unimpeded.
    const h = new SceneHarness();
    h.camera = { left: 0, top: 0, width: 640, height: 400 };

    const flight = h.flyBullet(bullet({ x: 300, xVel: 20 }), 40, {
      bounce: { kind: 'cheese', state: { bounces: 3, hits: new Set() } },
      onFrame: (frame, harness) => {
        // Scroll the view left-edge out to 200 partway through the flight, so
        // the right edge moves from 640 to 840.
        if (frame === 5) harness.scrollTo(200);
      },
    });

    expect(flight.bounces.length).toBeGreaterThan(0);
    // It bounced off the *moved* edge at 840 - 7, not the original 640 - 7.
    expect(flight.bounces[0].x).toBeCloseTo(833, 6);
  });

  it('a camera that never moves bounces at the original edge', () => {
    // The control. Same round, same frames, camera held still — so the
    // difference above is attributable to the scroll and nothing else.
    const h = new SceneHarness();
    const flight = h.flyBullet(bullet({ x: 300, xVel: 20 }), 40, {
      bounce: { kind: 'cheese', state: { bounces: 3, hits: new Set() } },
    });

    expect(flight.bounces[0].x).toBeCloseTo(633, 6);
  });

  it('re-reads the rect on every frame, not only on the first', () => {
    // The strongest form: scroll *between* two bounces of the same round and
    // require the two bounce points to differ. A rect read once and cached —
    // at spawn or at the first bounce — puts both at the same edge.
    const h = new SceneHarness();
    const flight = h.flyBullet(bullet({ x: 300, xVel: 20 }), 200, {
      bounce: { kind: 'cheese', state: { bounces: 3, hits: new Set() } },
      onFrame: (frame, harness) => {
        if (frame === 0) harness.scrollTo(0);
        // After the first bounce has certainly happened, widen the view.
        if (frame === 40) harness.scrollTo(-400);
      },
    });

    expect(flight.bounces.length).toBeGreaterThanOrEqual(2);
    const [first, second] = flight.bounces;
    expect(first.x).not.toBeCloseTo(second.x, 3);
  });

  // The one line the harness cannot reach.
  it('and the scene reads worldView inside the per-frame loop', () => {
    // Narrow by design: everything above proves the *rule* is live. This proves
    // only that the scene's loop is where the rect is read, which no amount of
    // driving the seam can show.
    const start = SCENE.indexOf('private advanceBullets');
    const body = SCENE.slice(start, SCENE.indexOf('\n  private ', start + 10));

    expect(body).toContain('cameras.main.worldView');
    expect(body).toContain('advance(deltaMs, camera)');
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * T4 gap 2 — "bounces off the camera rect and not the room bounds"
 * ──────────────────────────────────────────────────────────────────────── */
describe('the bounce is against the camera, with a room that would say otherwise', () => {
  it('bounces a round that is nowhere near a wall', () => {
    // The room is 1920 wide and the view 640, so this round bounces at 633
    // with over a thousand units of room to its right. A room-bounds rule
    // would fly it to 1920 and cull it.
    const h = new SceneHarness();
    expect(h.roomWidth).toBe(1920);

    const flight = h.flyBullet(bullet({ x: 300, xVel: 20 }), 60, {
      bounce: { kind: 'cheese', state: { bounces: 3, hits: new Set() } },
    });

    expect(flight.state).not.toBeNull();
    expect(flight.bounces[0].x).toBeCloseTo(633, 6);
    expect(flight.bounces[0].x).toBeLessThan(h.roomWidth - 1000);
  });

  it('culls the same round at the room edge once its bounces are gone', () => {
    // The other half: `:1812` routes a spent round to the ordinary cull, so it
    // then ignores the camera entirely and leaves at the *room* border. Both
    // rules are live at once, and which applies depends on the counter.
    const h = new SceneHarness();
    const flight = h.flyBullet(bullet({ x: 300, xVel: 20 }), 400, {
      bounce: { kind: 'cheese', state: { bounces: 1, hits: new Set() } },
    });

    expect(flight.state).toBeNull();
  });

  it('a non-bouncing round ignores the camera completely', () => {
    // No bounce state at all — an ordinary round crosses the view and keeps
    // going, which is what makes the camera rule weapon-specific rather than
    // a global border.
    const h = new SceneHarness();
    const flight = h.flyBullet(bullet({ x: 300, xVel: 20 }), 20);

    expect(flight.bounces).toEqual([]);
    expect(flight.state!.x).toBeGreaterThan(h.camera.width);
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * T1/T3 gap 1 — "gates the blast in the scene, ahead of the damage"
 * ──────────────────────────────────────────────────────────────────────── */
describe('the ice generation gate refuses damage, not just freeze', () => {
  it('leaves a stamped enemy on full health', () => {
    // The assertion the source check could not make. Previously this only
    // showed a `continue` appeared before `takeDamage` in the file; now the
    // enemy's health is checked, so a gate that skipped the freeze and dealt
    // the damage anyway fails here.
    const h = new SceneHarness();
    h.throwIceBall(); // generation 1
    h.enemies = [harnessEnemy({ trailId: 1, health: 100 })];

    const [outcome] = h.detonate(iceBlast());

    expect(outcome.applies).toBe(false);
    expect(h.enemies[0].health).toBe(100);
    expect(h.enemies[0].frozenFor).toBe(0);
  });

  it('damages an enemy the trail never reached', () => {
    const h = new SceneHarness();
    h.throwIceBall();
    h.enemies = [harnessEnemy({ trailId: null, health: 100 })];

    const [outcome] = h.detonate(iceBlast());

    expect(outcome.applies).toBe(true);
    expect(h.enemies[0].health).toBeLessThan(100);
    expect(h.enemies[0].frozenFor).toBe(200);
  });

  it('re-opens both halves on the next throw', () => {
    const h = new SceneHarness();
    h.throwIceBall();
    h.enemies = [harnessEnemy({ trailId: 1, health: 100 })];

    h.detonate(iceBlast());
    expect(h.enemies[0].health).toBe(100);

    h.throwIceBall(); // generation 2 — the stamp is now stale
    h.detonate(iceBlast());
    expect(h.enemies[0].health).toBeLessThan(100);
  });

  it('does not gate a non-ice blast on the generation at all', () => {
    // The gate is `ExplosionIce`-only; a Normal blast ignores the stamp.
    const h = new SceneHarness();
    h.throwIceBall();
    h.enemies = [harnessEnemy({ trailId: 1, health: 100 })];

    h.detonate(createExplosion({
      x: 0, y: 0, radius: 120, damage: 20, type: 'Normal', smallSound: false,
    }));

    expect(h.enemies[0].health).toBeLessThan(100);
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * T1/T3 gap 2 — "stamps behind an equipped-weapon check"
 * ──────────────────────────────────────────────────────────────────────── */
describe('only the Ice Ball consumes a generation', () => {
  it('an Ice Grenade blast leaves the enemy open to a later ball trail', () => {
    // The behaviour the source check gestured at. The grenade freezes, does not
    // stamp, and a trail patch from the *current* generation still bites — which
    // is the cross-weapon bug that would have had no local symptom.
    const h = new SceneHarness();
    h.throwIceBall(); // a ball is in flight, generation 1
    h.equippedSecondary = 'Ice Grenade';
    h.enemies = [harnessEnemy({ trailId: null })];

    h.detonate(iceBlast());

    expect(h.enemies[0].frozenFor).toBe(200);
    expect(h.enemies[0].trailId).toBeNull(); // not consumed

    const patch = createHazard({ type: 'Ice', x: 0, y: 0, trailLife: 220, payload: 175 });
    expect(
      iceFreezes(
        patch,
        { trailId: h.enemies[0].trailId, isBoss: false, iceMultiplier: 1 },
        h.iceTrailId,
        false,
      ),
    ).toBe(true);
  });

  it('an Ice Ball blast does consume it, closing the trail off', () => {
    // The contrast, on identical state — only the equipped weapon differs.
    const h = new SceneHarness();
    h.throwIceBall();
    h.equippedSecondary = 'Ice Ball';
    h.enemies = [harnessEnemy({ trailId: null })];

    h.detonate(iceBlast());

    expect(h.enemies[0].trailId).toBe(1);

    const patch = createHazard({ type: 'Ice', x: 0, y: 0, trailLife: 220, payload: 175 });
    expect(
      iceFreezes(
        patch,
        { trailId: h.enemies[0].trailId, isBoss: false, iceMultiplier: 1 },
        h.iceTrailId,
        false,
      ),
    ).toBe(false);
  });

  it('but the grenade is still gated by a live ball generation', () => {
    // Reading without consuming, both halves in one place.
    const h = new SceneHarness();
    h.throwIceBall();
    h.equippedSecondary = 'Ice Grenade';
    h.enemies = [harnessEnemy({ trailId: 1, health: 100 })];

    const [outcome] = h.detonate(iceBlast());

    expect(outcome.applies).toBe(false);
    expect(h.enemies[0].health).toBe(100);
  });

  /**
   * The laser gate, placed here rather than beside the laser wiring.
   *
   * `:6208` has three refusals and this is the only one that does **not**
   * consume the generation. The boss gate and the generation gate both leave
   * the enemy unstamped too, but they are permanent for that throw — a boss is
   * never freezable by a trail, and a stamped enemy is done until the next
   * throw. The laser refusal is *temporary*: the same trail, same generation,
   * freezes the enemy the moment the beam stops.
   *
   * That is the one place the laser wiring touches what T5 pinned above, which
   * is why it sits next to those rules and not in a laser test file.
   */
  it('the laser refuses a freeze without consuming the generation', () => {
    const h = new SceneHarness();
    h.throwIceBall(); // generation 1
    h.enemies = [harnessEnemy({ x: 200, y: 0, trailId: null })];
    h.hazards = [createHazard({ type: 'Ice', x: 200, y: 0, trailLife: 400, payload: 175 })];

    // Beam laid along the x axis, through the enemy.
    h.fireLaser(0, 0, 0);
    expect(h.laserTouched.has(0)).toBe(true);

    h.sweep();
    expect(h.enemies[0].frozenFor).toBe(0);
    // The refusal did NOT stamp — this is what separates it from the other two.
    expect(h.enemies[0].trailId).toBeNull();
  });

  it('and the same trail freezes it once the beam stops', () => {
    const h = new SceneHarness();
    h.throwIceBall();
    h.enemies = [harnessEnemy({ x: 200, y: 0, trailId: null })];
    h.hazards = [createHazard({ type: 'Ice', x: 200, y: 0, trailLife: 400, payload: 175 })];

    h.fireLaser(0, 0, 0);
    h.sweep();
    expect(h.enemies[0].frozenFor).toBe(0);

    // Same generation, same patch. Only the beam is gone.
    h.holdFire();
    h.hazards = [createHazard({ type: 'Ice', x: 200, y: 0, trailLife: 400, payload: 175 })];
    h.sweep();

    expect(h.enemies[0].frozenFor).toBe(175);
    expect(h.enemies[0].trailId).toBe(1);
  });

  it('unlike the boss and generation refusals, which outlast the frame', () => {
    // The contrast that makes the point. A boss is refused now and still
    // refused after any number of frames, because nothing about it changes.
    const boss = new SceneHarness();
    boss.throwIceBall();
    boss.enemies = [harnessEnemy({ x: 200, y: 0, isBoss: true, trailId: null })];
    boss.hazards = [createHazard({ type: 'Ice', x: 200, y: 0, trailLife: 400, payload: 175 })];

    boss.sweep();
    expect(boss.enemies[0].frozenFor).toBe(0);
    boss.sweep();
    expect(boss.enemies[0].frozenFor).toBe(0);
  });

  // The one line the harness cannot reach.
  it('and the scene passes the equipped secondary, not the blast source', () => {
    // `:6554` reads `ScreenGame.secondaryWeapon`. The harness proves what the
    // planner does with that value; only this shows the scene supplies it.
    const start = SCENE.indexOf('planBlastOn(');
    expect(start).toBeGreaterThan(-1);

    const call = SCENE.slice(start, SCENE.indexOf(');', start));
    expect(call).toContain('equippedSecondary: this.secondary?.name');
    expect(call).toContain('iceTrailId: this.iceTrailId');
  });
});

describe('one frame is one frame', () => {
  it('advances a bullet by its velocity at the AS3 rate', () => {
    // Guards the harness itself: if `FRAME_MS` and `stepBullet` disagreed, every
    // bounce assertion above would be measuring the wrong number of frames.
    const h = new SceneHarness();
    const flight = h.flyBullet(bullet({ x: 100, xVel: 20, yVel: 0 }), 1);

    expect(flight.state!.x).toBeCloseTo(120, 6);
    expect(FRAME_MS).toBeCloseTo(1000 / 30, 10);
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * T7 — Kill Reload, and the hazard-kill attribution it depends on
 * ──────────────────────────────────────────────────────────────────────── */
describe('a lava-trail kill credits the secondary cooldown', () => {
  /** A lava patch under an enemy weak enough for it to finish. */
  const setup = (level: number) => {
    const h = new SceneHarness();
    h.buyKillReload(level);
    h.secondaryReload = 700;
    // 60 a second is 2 a frame, so 20 health is ten frames of standing in it —
    // comfortably after the throw rather than on the same tick.
    h.enemies = [harnessEnemy({ x: 100, y: 0, health: 20 })];
    h.hazards = [createHazard({ type: 'Lava', x: 100, y: 0, trailLife: 280, payload: 60 })];
    return h;
  };

  it('pays out several frames after the throw, not at throw time', () => {
    // The case the whole T1-T6 arc made observable. The ball is long gone; the
    // enemy walks into a patch it left and dies to it. `:6282` sets the same
    // `dead` flag a bullet does, so the kill site runs and Kill Reload fires.
    const h = setup(10);

    let frames = 0;
    while (h.enemies.length > 0 && frames < 200) {
      h.sweep();
      if (h.enemies[0] && h.enemies[0].health <= 0) h.killEnemy(0);
      frames += 1;
    }

    expect(h.killLog).toEqual(['Normal']);
    expect(frames).toBe(10); // genuinely later than the throw, and exactly when
    expect(h.secondaryReload).toBe(689); // 700 - 11
  });

  it('pays nothing when the upgrade is unowned', () => {
    // The control, so the drop above is attributable to the upgrade and not to
    // anything else the sweep does.
    const h = setup(0);

    let frames = 0;
    while (h.enemies.length > 0 && frames < 200) {
      h.sweep();
      if (h.enemies[0] && h.enemies[0].health <= 0) h.killEnemy(0);
      frames += 1;
    }

    expect(h.killLog).toEqual(['Normal']);
    expect(h.secondaryReload).toBe(700);
  });

  it('an ice trail never pays, because it never kills', () => {
    // Ice freezes and deals no damage, and the fire drain erodes the patch
    // rather than the enemy. Lava is the only hazard that can trigger this,
    // which is worth pinning so a future "ice should do chip damage" change
    // fails here rather than quietly paying out.
    const h = new SceneHarness();
    h.buyKillReload(10);
    h.secondaryReload = 700;
    h.throwIceBall();
    h.enemies = [harnessEnemy({ x: 100, y: 0, health: 2 })];
    h.hazards = [createHazard({ type: 'Ice', x: 100, y: 0, trailLife: 400, payload: 175 })];

    for (let i = 0; i < 50; i += 1) h.sweep();

    expect(h.enemies).toHaveLength(1);
    expect(h.enemies[0].health).toBe(2);
    expect(h.secondaryReload).toBe(700);
  });
});

describe('Kill Reload is not gated the way the payout is', () => {
  it('a contact suicide pays no money but still shortens the cooldown', () => {
    // `:6849` sits *outside* the `noMoney` gate at `:6842`. So the one death
    // that deliberately pays nothing still buys cooldown — which reads like a
    // bug and is not.
    const h = new SceneHarness();
    h.buyKillReload(10);
    h.secondaryReload = 700;
    h.enemies = [harnessEnemy()];

    h.killEnemy(0, false);

    expect(h.money).toBe(0);
    expect(h.secondaryReload).toBe(689);
  });

  it('where an ordinary kill does both', () => {
    const h = new SceneHarness();
    h.buyKillReload(10);
    h.secondaryReload = 700;
    h.enemies = [harnessEnemy()];

    h.killEnemy(0, true);

    expect(h.money).toBe(1);
    expect(h.secondaryReload).toBe(689);
  });

  it('and a boss is not gated either, unlike lava damage', () => {
    // T3's lava rule quarters a boss; this one does not care. `:6849` has no
    // enemy-type branch at all, and the `enemyLevel == "B"` test two lines above
    // it only touches the boss tally. Asserted beside the lava contrast because
    // "hazard rules gate on boss" is a reasonable and wrong generalisation.
    const h = new SceneHarness();
    h.buyKillReload(10);
    h.secondaryReload = 700;
    h.enemies = [harnessEnemy({ isBoss: true })];

    h.killEnemy(0);

    expect(h.secondaryReload).toBe(689);
  });
});
