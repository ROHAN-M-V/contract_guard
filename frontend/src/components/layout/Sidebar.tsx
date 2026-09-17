import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  Bell,
  FileBarChart,
  Settings,
  LogOut,
  ShieldAlert,
  User,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { useQuery } from '@tanstack/react-query';
import { alertsService } from '@/services/alerts.service';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getStoredUser();

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', { unread: true }],
    queryFn: () => alertsService.getAlerts({ unread: true }),
    refetchInterval: 30000,
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/contracts', label: 'Contracts', icon: FileText },
    { to: '/upload', label: 'Upload Documents', icon: UploadCloud },
    { to: '/alerts', label: 'Alerts', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { to: '/reports', label: 'Reports', icon: FileBarChart },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
            Contract Guard
          </h1>
        </div>
      </div>

      {/* Synthetic Demo Banner */}
      

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Oversight Operations
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-xs border-l-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                )
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className="pt-4 mt-4 border-t border-slate-800/80">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            System Administration
          </p>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              )
            }
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings & Services</span>
          </NavLink>
        </div>
      </nav>

      {/* User profile & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50">
        <div className="p-2 rounded bg-slate-900/80 border border-slate-800 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-semibold">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">
                {user?.full_name || 'Auditor In-Charge'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.role || 'AUDITOR'} • {user?.department || 'Audit Dept'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded border border-transparent hover:border-rose-900/50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
