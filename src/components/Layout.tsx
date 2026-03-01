import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, DollarSign, AlertTriangle, Lightbulb, TrendingUp,
  Cloud, Shield, FileText, Settings, MessageSquare, Bell, LogOut, Menu,
  X, ChevronDown, Wrench, BookOpen
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { ChatSidebar } from './ChatSidebar';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/budgets', icon: DollarSign, label: 'Budgets' },
  { path: '/anomalies', icon: AlertTriangle, label: 'Anomalies' },
  { path: '/recommendations', icon: Lightbulb, label: 'Recommendations' },
  { path: '/forecasts', icon: TrendingUp, label: 'Forecasts' },
  { path: '/providers', icon: Cloud, label: 'Cloud Providers' },
  { path: '/remediations', icon: Wrench, label: 'Remediations' },
  { path: '/policies', icon: Shield, label: 'Policies' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout() {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, clearNotifications } = useWebSocket(token);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'bg-sidebar text-white flex flex-col transition-all duration-200 flex-shrink-0',
        sidebarOpen ? 'w-60' : 'w-16'
      )}>
        <div className="flex items-center gap-2 px-4 h-16 border-b border-white/10">
          <BookOpen className="w-7 h-7 text-primary-400 flex-shrink-0" />
          {sidebarOpen && <span className="font-bold text-lg tracking-tight">FinOpsMind</span>}
        </div>
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-2 rounded-lg',
                  active ? 'bg-sidebar-active text-white' : 'text-gray-400 hover:bg-sidebar-hover hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          {sidebarOpen && user && (
            <div className="text-xs text-gray-400 mb-2 px-2 truncate">
              {user.email}
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-2 py-2 text-sm text-gray-400 hover:text-white w-full rounded-lg hover:bg-sidebar-hover transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {navItems.find((n) => n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path))?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                chatOpen ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
              title="AI Assistant"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between p-3 border-b">
                    <span className="font-semibold text-sm">Notifications</span>
                    <button onClick={clearNotifications} className="text-xs text-primary-600 hover:underline">Clear</button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={i} className="p-3 border-b last:border-0 hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full',
                            n.type === 'anomaly_alert' ? 'bg-red-100 text-red-700' :
                            n.type === 'budget_alert' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          )}>
                            {n.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 truncate">{JSON.stringify(n.data).slice(0, 80)}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pl-3 border-l">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              {user && <span className="text-sm font-medium text-gray-700 hidden md:block">{user.first_name}</span>}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Chat Sidebar */}
      {chatOpen && <ChatSidebar onClose={() => setChatOpen(false)} />}
    </div>
  );
}
