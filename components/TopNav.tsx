'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserMenu from './UserMenu';
import { ThemeToggle } from './ThemeProvider';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}

function NavLink({ href, children, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        active
          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {children}
    </Link>
  );
}

export default function TopNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/forms') {
      return pathname === '/forms' || pathname.startsWith('/forms/');
    }
    if (path === '/forms/new') {
      return pathname === '/forms/new' || pathname.startsWith('/databases');
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <header className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b dark:border-gray-800 z-50 transition-colors">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-gray-900 dark:text-gray-100">
            Notion Form Builder
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink href="/forms" active={isActive('/forms') && !isActive('/forms/new')}>
              My Forms
            </NavLink>
            <NavLink href="/forms/new" active={isActive('/forms/new')}>
              New Form
            </NavLink>
            <NavLink href="/directory" active={isActive('/directory')}>
              Directory
            </NavLink>
            <NavLink href="/settings" active={isActive('/settings')}>
              Settings
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
      {/* Mobile nav */}
      <nav className="sm:hidden border-t dark:border-gray-800 px-4 py-2 flex gap-1 overflow-x-auto">
        <NavLink href="/forms" active={isActive('/forms') && !isActive('/forms/new')}>
          My Forms
        </NavLink>
        <NavLink href="/forms/new" active={isActive('/forms/new')}>
          New Form
        </NavLink>
        <NavLink href="/directory" active={isActive('/directory')}>
          Directory
        </NavLink>
        <NavLink href="/settings" active={isActive('/settings')}>
          Settings
        </NavLink>
      </nav>
    </header>
  );
}
