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
