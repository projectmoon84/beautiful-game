import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from './components/AppShell';
import Matches from './screens/Matches';
import Standings from './screens/Standings';
import Insights from './screens/Insights';
import Sandbox from './screens/Sandbox';
import MatchPage from './screens/MatchPage';
import SharePage from './screens/SharePage';
import GroupView from './screens/GroupView';
import TeamPage from './screens/TeamPage';
import AdminShell from './screens/AdminShell';
import AdminTeams from './screens/admin/AdminTeams';
import AdminFixtures from './screens/admin/AdminFixtures';
import AdminInsights from './screens/admin/AdminInsights';
import AdminNews from './screens/admin/AdminNews';
import AdminStickers from './screens/admin/AdminStickers';
import AdminTextures from './screens/admin/AdminTextures';
import AdminSync from './screens/admin/AdminSync';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Matches /> },
      { path: 'standings', element: <Standings /> },
      { path: 'group/:id', element: <GroupView /> },
      { path: 'team/:id', element: <TeamPage /> },
      { path: 'insights', element: <Insights /> },
      { path: 'sandbox', element: <Sandbox /> },
      { path: 'match/:id', element: <MatchPage /> },
      { path: 'share/:id', element: <SharePage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminShell />,
    children: [
      { path: 'teams',    element: <AdminTeams /> },
      { path: 'fixtures', element: <AdminFixtures /> },
      { path: 'insights', element: <AdminInsights /> },
      { path: 'news',     element: <AdminNews /> },
      { path: 'stickers', element: <AdminStickers /> },
      { path: 'textures', element: <AdminTextures /> },
      { path: 'sync',     element: <AdminSync /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
