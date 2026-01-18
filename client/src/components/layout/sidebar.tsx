import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FolderKanban,
  Link2,
  Settings,
  Users,
  Building2,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Connections', href: '/connections', icon: Link2, adminOnly: true },
  { name: 'Team', href: '/team', icon: Users, adminOnly: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const platformAdminNav = [
  { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';
  const isPlatformAdmin = user?.role === 'platform_admin';

  const filteredNav = navigation.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Foundry</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {filteredNav.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {isPlatformAdmin && (
          <>
            <div className="my-4 border-t pt-4">
              <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                Platform Admin
              </p>
              {platformAdminNav.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* User info and logout */}
      <div className="border-t p-4">
        <div className="mb-3">
          <p className="text-sm font-medium">{user?.name || user?.email}</p>
          <p className="text-xs text-muted-foreground">{user?.organizationName}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
