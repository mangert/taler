import { BrowserRouter } from 'react-router-dom';
import { SkipLink } from '../shared/ui/SkipLink';
import { AppProviders } from './AppProviders';
import { AppRouter } from './AppRouter';

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <SkipLink />
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
