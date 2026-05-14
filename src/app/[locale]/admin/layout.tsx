'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Users } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/dids', label: 'Seller Registry', icon: Users, exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn || !user || user.handle !== 'openmkt.app') {
      router.push('/');
    }
  }, [isLoggedIn, user, isLoading, router]);

  if (isLoading || !isLoggedIn || !user || user.handle !== 'openmkt.app') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin top bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-8 flex items-center gap-1 h-14">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mr-4">
            Admin
          </span>
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">{children}</div>
    </div>
  );
}
