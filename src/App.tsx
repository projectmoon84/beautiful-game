import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from './components/AppShell';
import Matches from './screens/Matches';
import Standings from './screens/Standings';
import Insights from './screens/Insights';
import Sandbox from './screens/Sandbox';
import MatchPage from './screens/MatchPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Matches /> },
      { path: 'standings', element: <Standings /> },
      { path: 'insights', element: <Insights /> },
      { path: 'sandbox', element: <Sandbox /> },
      { path: 'match/:id', element: <MatchPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
