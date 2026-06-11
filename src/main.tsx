import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ThemeProvider } from './theme/ThemeProvider';
import App from './App';
import { dataService } from './data/dataService';

const root = createRoot(document.getElementById('root')!);

dataService.init().then(() => {
  root.render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
});

// Reload when the app resumes from background after 10+ minutes so data and
// code stay fresh. iOS keeps home-screen web apps in memory indefinitely,
// meaning stale scores and statuses would persist without this.
let hiddenAt = 0;
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now();
  } else if (hiddenAt > 0 && Date.now() - hiddenAt > STALE_THRESHOLD_MS) {
    window.location.reload();
  }
});
