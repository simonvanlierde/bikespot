import { registerSW } from 'virtual:pwa-register';
import { render } from 'preact';

import App from './App';
// Applies the stored theme to <html> at import, before the first render.
import './lib/theme';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found');
}

render(<App />, rootElement);

registerSW({ immediate: true });
