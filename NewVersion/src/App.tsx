import { GameCanvas } from './ui/GameCanvas';
import { Hud } from './ui/Hud';
import { LoadingScreen } from './ui/screens/LoadingScreen';
import { MainMenuScreen } from './ui/screens/MainMenuScreen';
import { LevelSelectScreen } from './ui/screens/LevelSelectScreen';
import { UpgradesScreen } from './ui/screens/UpgradesScreen';
import { EnemiesScreen } from './ui/screens/EnemiesScreen';
import { DiagnosticsPanel } from './ui/DiagnosticsPanel';

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
  return (
    <div className="app">
      <GameCanvas />
      <div className="app__overlay">
        <LoadingScreen />
        <MainMenuScreen />
        <LevelSelectScreen />
        <UpgradesScreen />
        <EnemiesScreen />
        <Hud />
        <DiagnosticsPanel />
      </div>
    </div>
  );
}
