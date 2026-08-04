/**
 * Particle art — which shape each `Particle*` clip's frames draw.
 *
 * Generated from `assets.swf` the way `propArt.ts` was: every `DefineSprite`
 * frame places one `DefineShape`, so a frame maps to a shape id and JPEXS's
 * `shapes/<id>.svg` is the art. Keys are the AS3 class names minus the
 * `Particle` prefix, matching `ParticlePreset.sprite`.
 *
 * All 32 resolved and all 44 shapes were already exported — no extraction step,
 * unlike the props.
 */
export interface ParticleClip {
  /** `assets.swf` character id. */
  symbol: number;
  /** Shape id per 1-based frame. */
  frames: readonly number[];
}

export const PARTICLE_CLIPS: Readonly<Record<string, ParticleClip>> = {
  Black: { symbol: 1075, frames: [1074] },
  Blue: { symbol: 1063, frames: [1062] },
  Cyan: { symbol: 1061, frames: [1060] },
  Green: { symbol: 1133, frames: [1132] },
  Green2: { symbol: 1100, frames: [1099] },
  Green3: { symbol: 1098, frames: [1097] },
  Grey: { symbol: 1073, frames: [1072] },
  Heal: { symbol: 1125, frames: [1124] },
  HealBoss: { symbol: 1123, frames: [1122] },
  Immune: { symbol: 1069, frames: [1068] },
  LightBlue: { symbol: 1127, frames: [1126] },
  Lock: { symbol: 1059, frames: [843] },
  Magic: { symbol: 1079, frames: [1076, 1077, 1078] },
  MuzzleFlareBig: { symbol: 1118, frames: [1114, 1115, 1116, 1117] },
  MuzzleFlareMedium: { symbol: 1112, frames: [1108, 1109, 1110, 1111] },
  MuzzleFlareSmall: { symbol: 1121, frames: [1119, 1109, 1116, 1120] },
  Orange: { symbol: 1129, frames: [1128] },
  OrangeBrown: { symbol: 1084, frames: [1083] },
  Pink: { symbol: 1131, frames: [1130] },
  Poison: { symbol: 1082, frames: [1080, 1081] },
  Purple: { symbol: 1106, frames: [1105] },
  Red: { symbol: 1086, frames: [1085] },
  RedGrey: { symbol: 1096, frames: [1095] },
  Reflect: { symbol: 1067, frames: [1064, 1065, 1066] },
  Smoke: { symbol: 1092, frames: [1091] },
  Strength: { symbol: 1071, frames: [1070] },
  Weakness: { symbol: 1338, frames: [1337] },
  White: { symbol: 1104, frames: [1103] },
  White2: { symbol: 1102, frames: [1101] },
  WhiteRed: { symbol: 1094, frames: [1093] },
  Yellow: { symbol: 1090, frames: [1089] },
  Yellow2: { symbol: 1088, frames: [1087] },
};

/**
 * The shape a particle draws, or undefined when the sprite name is unknown.
 *
 * ── Why this is strict where `presetFor` is permissive ────────────────────
 * `presetFor` falls through to the debris preset for any unrecognised type,
 * which is faithful: the AS3 selects debris with a *negative* check, so a name
 * it does not recognise is debris by construction.
 *
 * What the AS3 also had, and this port does not, is a compiler that refused to
 * build `new ParticleTpyo()`. A mistyped particle type there was a compile
 * error; here it would silently render as debris and look almost right. So the
 * guarantee is replaced rather than dropped: `particleArt.test.ts` asserts
 * every sprite named by the preset table resolves to a real clip, which fails
 * the build instead. **The permissive fallback and the strict check are not in
 * tension — the check is what the fallback used to lean on.**
 */
export function particleShape(sprite: string, frame: number): number | undefined {
  const clip = PARTICLE_CLIPS[sprite];
  if (!clip || clip.frames.length === 0) return undefined;
  return clip.frames[Math.min(Math.max(frame, 1), clip.frames.length) - 1];
}
