/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run weapon-art:data
 *
 * The 25 frames of `WeaponInterface` (symbol 1198) — the HUD's weapon
 * icon. See scripts/gen-weapon-art.mjs for the frame contracts and for where
 * the layer offsets come from.
 *
 * Frame numbers are the AS3's own `gotoAndStop` arguments — 1-based. Which
 * weapon each frame belongs to is `weaponPanel.ts`, transcribed from
 * `WeaponInterface.update`; this file is only the pictures.
 */

export interface WeaponArtLayer {
  /** DefineShape id — `shapes/<id>.svg`. */
  shape: number;
  /** Authored size, in the SWF's units. */
  width: number;
  height: number;
  /**
   * Where this layer's **centre** goes, relative to the icon's anchor.
   *
   * `boxCentre - origin`. Non-zero for 21 of the 24 glyphs, because Flash
   * places every layer at the clip origin and a shape's origin is rarely its
   * box centre — centring the layers instead would misplace `Cannon` by 4.31
   * units on a 30-unit socket.
   */
  dx: number;
  dy: number;
}

export interface WeaponArtFrame {
  /** 1-25, the `gotoAndStop` argument. */
  frame: number;
  /** The socket first, then the weapon's glyph. Frame 1 is the socket alone. */
  layers: readonly WeaponArtLayer[];
}

/** The SWF symbol, as named in `WeaponInterface.as`'s `[Embed]` line. */
export const WEAPON_PANEL_SYMBOL = 1198;

/** Shape 596, the plate under every glyph — 30x30. */
export const WEAPON_SOCKET_SHAPE = 596;
export const WEAPON_SOCKET_SIZE = 30;

export const WEAPON_ART_FRAMES: readonly WeaponArtFrame[] = Object.freeze([
  { frame: 1, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }] },
  { frame: 2, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 619, width: 20.6, height: 20.6, dx: -3.05, dy: 3.05 }] },
  { frame: 3, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 641, width: 22.4, height: 24.55, dx: -2.1, dy: 1.13 }] },
  { frame: 4, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 597, width: 24.6, height: 24.65, dx: -1.95, dy: 1.97 }] },
  { frame: 5, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 621, width: 25.8, height: 26.1, dx: -1.4, dy: 1.25 }] },
  { frame: 6, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 622, width: 25.6, height: 25.6, dx: -0.55, dy: 0.55 }] },
  { frame: 7, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 1191, width: 24, height: 26.35, dx: -1.85, dy: 0.73 }] },
  { frame: 8, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 624, width: 24.45, height: 24.45, dx: -0.22, dy: 0.22 }] },
  { frame: 9, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 607, width: 23.55, height: 23.6, dx: -2.47, dy: 2.5 }] },
  { frame: 10, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 1192, width: 27.85, height: 27.85, dx: -0.32, dy: 0.38 }] },
  { frame: 11, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 616, width: 26.9, height: 26.9, dx: -1.45, dy: 1.45 }] },
  { frame: 12, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 610, width: 24.95, height: 25, dx: -2.13, dy: 2.15 }] },
  { frame: 13, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 613, width: 25.75, height: 25.75, dx: 1.13, dy: -1.13 }] },
  { frame: 14, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 702, width: 21, height: 21, dx: 0, dy: 0 }] },
  { frame: 15, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 1193, width: 17.85, height: 23.2, dx: -1.22, dy: -0.7 }] },
  { frame: 16, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 1194, width: 17.85, height: 23.2, dx: -1.22, dy: -0.7 }] },
  { frame: 17, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 1195, width: 17.85, height: 23.2, dx: -1.22, dy: -0.7 }] },
  { frame: 18, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 708, width: 20.4, height: 21.35, dx: 0.25, dy: -1.42 }] },
  { frame: 19, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 705, width: 21.95, height: 22.35, dx: -0.13, dy: -1.27 }] },
  { frame: 20, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 1196, width: 21, height: 21, dx: 0, dy: 0 }] },
  { frame: 21, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 696, width: 20.1, height: 21.75, dx: 1.35, dy: -0.97 }] },
  { frame: 22, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 726, width: 23, height: 22.25, dx: -1.25, dy: 0.13 }] },
  { frame: 23, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 723, width: 23.1, height: 23.3, dx: -1.3, dy: 0.65 }] },
  { frame: 24, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 720, width: 25, height: 26.35, dx: 1.1, dy: -1.47 }] },
  { frame: 25, layers: [{ shape: 596, width: 30, height: 30, dx: 0, dy: 0 }, { shape: 1197, width: 23.05, height: 23.05, dx: -0.47, dy: 0.47 }] },
]);

/** Every shape the icon draws — what the asset sync must have copied. */
export const WEAPON_SHAPE_IDS: readonly number[] = Object.freeze(
  [596,597,607,610,613,616,619,621,622,624,641,696,702,705,708,720,723,726,1191,1192,1193,1194,1195,1196,1197],
);
