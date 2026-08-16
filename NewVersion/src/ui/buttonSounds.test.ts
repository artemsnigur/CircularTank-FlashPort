import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CLICK_SOUND,
  HOVER_SOUND,
  INTERACTIVE_SELECTOR,
  SILENT_ATTRIBUTE,
  isAudible,
} from './buttonSounds';
import { SFX } from '../assets/audioManifest';

/**
 * ── What these assertions cover, and what they do not ─────────────────────
 *
 * **They prove** that a control is classified audible or silent correctly, that
 * both sound names resolve against the manifest, and that every component
 * holding a `<button>` is mounted inside the delegated listener's subtree.
 *
 * **They do not prove that anything is audible.** No test here plays a sound.
 * The queue history (`game/audio/queueHistory.ts`) is what makes a trigger
 * observable at runtime, and `audioSelfTest.ts` is what confirms the transport
 * actually advanced. "Button sounds are tested" must not be read as "the player
 * hears them" — those are three separate claims and this file is the first.
 */

const UI_DIR = join(import.meta.dirname, '.');
const APP = readFileSync(join(UI_DIR, '..', 'App.tsx'), 'utf8');

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.includes('.test.')
      ? [path]
      : [];
  });
}

const element = (html: string): Element => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as Element;
};

describe('isAudible', () => {
  it('accepts a plain button and a role=button', () => {
    expect(isAudible(element('<button>Play</button>'))).toBe(true);
    expect(isAudible(element('<div role="button">Play</div>'))).toBe(true);
  });

  it('accepts a click on a child of a button', () => {
    // The delegated listener sees the deepest node, so a button containing a
    // span must still resolve. This is the case that silently loses sounds if
    // the lookup is `matches` rather than `closest`.
    const button = element('<button><span>Play</span></button>');
    expect(isAudible(button.querySelector('span'))).toBe(true);
  });

  it('rejects anything that is not a control', () => {
    expect(isAudible(element('<div>text</div>'))).toBe(false);
    expect(isAudible(null)).toBe(false);
  });

  it('rejects an opted-out control and a disabled one', () => {
    // Pinned beside the accepted case above, so "silent" cannot widen to
    // everything without the first test failing too.
    expect(isAudible(element(`<button ${SILENT_ATTRIBUTE}>x</button>`))).toBe(false);
    expect(isAudible(element('<button disabled>x</button>'))).toBe(false);
  });
});

describe('the two sound names', () => {
  it('both resolve against the manifest', () => {
    // The `EnemyShoot` failure mode, caught at build time for these two: a name
    // the manifest does not know is warned about and silently dropped at
    // runtime. `resolved: false` in the queue history is the runtime half.
    const known = new Set(SFX.map((entry) => entry.name));
    expect(known.has(HOVER_SOUND)).toBe(true);
    expect(known.has(CLICK_SOUND)).toBe(true);
  });

  it('are the AS3`s two, not one doing both jobs', () => {
    expect(HOVER_SOUND).toBe('InterfaceButtonOver1');
    expect(CLICK_SOUND).toBe('InterfaceButtonClick');
    expect(HOVER_SOUND).not.toBe(CLICK_SOUND);
  });
});

describe('coverage — the partition, not any single button', () => {
  /**
   * 115 sites collapsing to one delegated listener means the risk is not that
   * a button sounds wrong; it is that a button sits **outside the subtree** and
   * nothing objects. This is the same shape as `MISC_WITHOUT_EFFECT` and the
   * dev-aid inventory: the value is the guarantee that nothing is outside the
   * set.
   */
  /**
   * Comments stripped first — **a component that *mentions* `<button>` in its
   * docstring does not render one.**
   *
   * `ChromeArt` is the case that found this: its header explains that the art
   * is `aria-hidden` when the caller is "a real `<button>` that carries its own
   * accessible name", and that sentence put it on this list and failed the
   * assertion below. The component has no control in it at all.
   *
   * Left as a scan over source rather than something cleverer, because the
   * point of this list is that nothing is outside it; but a scan that reads
   * prose as code produces a false *positive* here and could as easily produce
   * a false negative, which is the direction that matters.
   */
  const withoutComments = (source: string): string =>
    source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*)/.test(line))
      .join('\n');

  const componentsWithButtons = tsxFiles(UI_DIR)
    .filter((file) => withoutComments(readFileSync(file, 'utf8')).includes('<button'))
    .map((file) => file.split(/[\\/]/).pop()!.replace('.tsx', ''));

  it('finds the components that render controls', () => {
    // A floor check: if this ever returns nothing the two assertions below
    // become vacuous and would pass silently.
    expect(componentsWithButtons.length).toBeGreaterThan(5);
  });

  it('mounts every one of them inside the overlay the listener is on', () => {
    // `installButtonSounds` is attached to `app__overlay`. A component rendered
    // outside it — a sibling of the canvas, say — would get no sound at all,
    // and no test of the button itself would notice.
    //
    // **Reachability, not direct mounting.** The first version of this checked
    // whether each component appeared in App's overlay JSX, and failed on
    // `AudioToggles` — which is covered, because it is nested inside
    // `MainMenuScreen`. A delegated listener covers a whole subtree, so the
    // question is whether the component is *reachable* from the overlay's
    // roots, and the check has to walk imports to answer it.
    const overlayJsx = APP.slice(APP.indexOf('app__overlay'));
    const roots = [...overlayJsx.matchAll(/<([A-Z]\w+)[\s/>]/g)].map((m) => m[1]);

    const byName = new Map(
      tsxFiles(UI_DIR).map((file) => [file.split(/[\\/]/).pop()!.replace('.tsx', ''), file]),
    );

    const reachable = new Set<string>();
    const walk = (name: string): void => {
      if (reachable.has(name)) return;
      reachable.add(name);
      const file = byName.get(name);
      if (!file) return;
      const source = readFileSync(file, 'utf8');
      for (const [, child] of source.matchAll(/<([A-Z]\w+)[\s/>]/g)) walk(child);
    };
    for (const root of roots) walk(root);

    for (const name of componentsWithButtons) {
      expect(reachable.has(name), `<${name}> is not reachable from app__overlay`).toBe(true);
    }
  });

  it('attaches the listener to the overlay and nothing else', () => {
    // Source-shape check, flagged as such: it proves the wiring is *written*,
    // never that the listener fires. The driven proof is the harness sequence
    // in `npm run look -- --sound`.
    expect(APP).toContain('installButtonSounds');
    expect(APP).toMatch(/app__overlay"\s+ref=\{overlay\}/);
  });
});

describe('the silent set is closed', () => {
  it('lists every opt-out in the tree', () => {
    // Exemptions are an enumerated set, not a habit. A new `data-silent`
    // anywhere fails this until it is named here with a reason.
    const optedOut = tsxFiles(UI_DIR)
      .filter((file) => readFileSync(file, 'utf8').includes(SILENT_ATTRIBUTE))
      .map((file) => file.split(/[\\/]/).pop()!.replace('.tsx', ''));

    // DiagnosticsPanel is a dev aid, not a game control — it is removed with
    // the other dev affordances and should never have made the AS3's UI sound.
    expect(optedOut).toEqual(['DiagnosticsPanel']);
  });
});

describe('the selector covers every interactive role in the tree', () => {
  /**
   * **The gap this closes.** The selector matched `button` and
   * `[role="button"]` only, so T54's six `role="switch"` checkboxes shipped
   * silent while the coverage tests above reported success — they asked "is
   * every component inside the listener's subtree", which was true, and never
   * "does the selector match every control".
   *
   * Same shape as `setMusic` bypassing the queue history: a real guarantee
   * with a narrower scope than it reads.
   */
  const rolesInUse = (): string[] => {
    const roles = new Set<string>();
    for (const file of tsxFiles(UI_DIR)) {
      for (const [, role] of readFileSync(file, 'utf8').matchAll(/role="([a-z]+)"/g)) {
        roles.add(role);
      }
    }
    return [...roles];
  };

  /** Roles that are containers or output, not controls. */
  const NON_INTERACTIVE = new Set([
    'group',
    'progressbar',
    'dialog',
    'navigation',
    'list',
    // `alert` is an announcement, not a control — it takes no input.
    'alert',
    // `tooltip` is output too, and `pointer-events: none` at that. The AS3
    // agrees about where the sound belongs: `InterfaceButtonOver1` is pushed by
    // the *trigger* on roll-over (`ButtonUpgradeInfo.as:33`), never by
    // `PartInfoText`, which has no sound of its own.
    'tooltip',
    // `img` is a picture. The resistance badges carry one *and* a hover
    // tooltip, so "hoverable" and "a control" come apart here — and the AS3
    // agrees: `IconStrongWeak.as` has no `sfxArray.push` anywhere, unlike every
    // `Button*` class, which pushes `InterfaceButtonOver1` on roll-over.
    'img',
  ]);

  it('finds the roles actually used, so this is not vacuous', () => {
    expect(rolesInUse().length).toBeGreaterThan(2);
    expect(rolesInUse()).toContain('switch');
  });

  it('matches every interactive role present', () => {
    for (const role of rolesInUse()) {
      if (NON_INTERACTIVE.has(role)) continue;
      const element = document.createElement('div');
      element.setAttribute('role', role);
      expect(isAudible(element), `role="${role}" makes no sound`).toBe(true);
    }
  });

  it('still rejects the container roles, so it has not widened to everything', () => {
    // The counterpart. A selector of `*` would pass the assertion above.
    for (const role of ['group', 'progressbar', 'dialog']) {
      const element = document.createElement('div');
      element.setAttribute('role', role);
      expect(isAudible(element), `role="${role}" should be silent`).toBe(false);
    }
  });

  it('names the switch role explicitly, since that is the one that was missing', () => {
    expect(INTERACTIVE_SELECTOR).toContain('[role="switch"]');
  });
});
