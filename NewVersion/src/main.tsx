import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { attachStoreBridge } from './state/bridge';
import { installErrorCapture } from './state/errorCapture';
import { installMenuRoute } from './state/menuRoute';
import { watchSafeArea } from './state/safeArea';
import './styles/fonts.css';
import './styles/global.css';

/**
 * All four are installed at module scope, before React renders.
 *
 * The bridge must already be listening when the Boot scene emits its first
 * event, and installing it here (rather than in an effect) also means
 * StrictMode's double effect invocation cannot double-subscribe it — every
 * event would otherwise be applied to the store twice. `installMenuRoute` is
 * in the same position for the same reason: doubled, it would emit each
 * `ui:goto` twice.
 */
installErrorCapture();
attachStoreBridge();
watchSafeArea();
installMenuRoute();

const container = document.getElementById('root');
if (!container) throw new Error('#root not found in index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
