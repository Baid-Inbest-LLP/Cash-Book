import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useMe } from '../../hooks/useAuth';
import { useLookups } from '../../hooks/useMasters';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Warm the shared caches once the authenticated shell mounts.
  useMe();
  useLookups();

  return (
    <div className="app-layout flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} />
      <div className="app-layout__column">
        <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
