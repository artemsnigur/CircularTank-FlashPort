import { SaveSlotScreen } from './ui/screens/SaveSlotScreen';
import { GameCanvas } from './ui/GameCanvas';
import { Hud } from './ui/Hud';
import { LoadingScreen } from './ui/screens/LoadingScreen';
import { MainMenuScreen } from './ui/screens/MainMenuScreen';
import { LevelSelectScreen } from './ui/screens/LevelSelectScreen';
import { UpgradesScreen } from './ui/screens/UpgradesScreen';
import { EnemiesScreen } from './ui/screens/EnemiesScreen';
import { BestiaryScreen } from './ui/screens/BestiaryScreen';
import { OptionsScreen } from './ui/screens/OptionsScreen';
import { AchievementsScreen } from './ui/screens/AchievementsScreen';
import { ThemeGalleryScreen } from './ui/screens/ThemeGalleryScreen';
import { installButtonSounds } from './ui/buttonSounds';
import { useEffect, useRef } from 'react';
import { InfoText } from './ui/InfoText';

/**
 * App shell.
 *
 * Layering, bottom to top:
 *   1. GameCanvas   — the only Phaser instance, full-bleed.
 *   2. overlays     — React screens and HUD, positioned inside the safe area.
 *
 * The overlay layer is `pointer-events: none` by default so taps reach the
 * canvas; buttons opt back in. That is what lets a React menu sit on top of a
 * live game without stealing input from it.
 */
export function App(): React.ReactElement {
  const overlay = useRef<HTMLDivElement>(null);

  // One delegated pair of listeners for every DOM control in the tree. Not per
  // button: the port has no shared button component, so coverage comes from
  // position in the tree rather than from remembering to use a wrapper. See
  // `ui/buttonSounds.ts`.
  //
  // In an effect rather than at module scope — unlike the bridge and the
  // safe-area watcher, this needs the mounted node. StrictMode's double invoke
  // is harmless because the cleanup removes the listeners it added.
  useEffect(() => {
    const node = overlay.current;
    return node ? installButtonSounds(node) : undefined;
  }, []);

  return (
    <div className="app">
      <GameCanvas />
      <div className="app__overlay" ref={overlay}>
        <LoadingScreen />
        <MainMenuScreen />
        <SaveSlotScreen />
        <LevelSelectScreen />
        <UpgradesScreen />
        <EnemiesScreen />
        <BestiaryScreen />
        <OptionsScreen />
        <AchievementsScreen />
        {/*
          DEV-AID: the ground-theme gallery (`#themes`). Mounted unconditionally
          because it renders nothing unless its scene is active, and that scene
          is registered only in a dev build — so in production this is a
          component that can never match. Gating the mount as well would add a
          second place to keep in step for no gain.
        */}
        <ThemeGalleryScreen />
        <Hud />
        {/*
          One panel for the whole app. The AS3 gives each of its eight screens
          its own `PartInfoText` and hands it to that screen's buttons as
          `pText`; a single mounted panel is the same arrangement without the
          plumbing. Last so it paints over everything it describes.
        */}
        <InfoText />
      </div>
    </div>
  );
}
