import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Calendar, 
  Users, 
  LogOut,
  Menu,
  X,
  Settings,
  Bell,
  Shield,
  ChevronDown,
  Search,
  Home,
  Zap,
  Activity,
  Moon,
  Sun,
  ChevronRight,
  Plus,
  User,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const ADMIN_ROUTES = [
  { 
    path: '/admin/dashboard', 
    name: 'Dashboard', 
    icon: LayoutDashboard,
    badge: null
  },
  { 
    path: '/admin/quotes', 
    name: 'Quotations', 
    icon: FileText,
    badge: null
  },
  { 
    path: '/admin/customers', 
    name: 'Customers', 
    icon: Users,
    badge: null
  },
  { 
    path: '/admin/packages', 
    name: 'Packages', 
    icon: Package,
    badge: null
  },
  { 
    path: '/admin/messages', 
    name: 'Messages', 
    icon: MessageSquare,
    badge: null
  },
  { 
    path: '/admin/equipment', 
    name: 'Equipment', 
    icon: Zap,
    badge: null
  },
  { 
    path: '/admin/settings', 
    name: 'Settings', 
    icon: Settings,
    badge: null
  },
];

export function AdminLayout({ children }) {
  const { adminUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const fetchNewCount = useCallback(async () => {
    try {
      const res = await adminAPI.getMessages({ status: 'new', limit: 1, page: 1 });
      if (res && typeof res.total === 'number') {
        setNewMsgCount(res.total);
      } else if (Array.isArray(res?.items)) {
        setNewMsgCount(res.items.length);
      } else if (Array.isArray(res)) {
        setNewMsgCount(res.length);
      } else {
        setNewMsgCount(0);
      }
    } catch {
      setNewMsgCount(0);
    }
  }, []);

  // Fetch new messages count and poll periodically
  useEffect(() => {
    let timer;
    fetchNewCount();
    timer = setInterval(fetchNewCount, 60000); // refresh every 60s
    return () => clearInterval(timer);
  }, [fetchNewCount]);

  // Listen for explicit refresh events from sub-pages
  useEffect(() => {
    const handler = () => fetchNewCount();
    window.addEventListener('admin:refresh-badges', handler);
    return () => window.removeEventListener('admin:refresh-badges', handler);
  }, [fetchNewCount]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/admin/login');
    }
  };

  const isActive = (path) => {
    return location.pathname === path || 
           (path === '/admin/dashboard' && location.pathname === '/admin');
  };

  const getNavItemClasses = (active = false) => {
    return active 
      ? 'bg-primary-50 text-primary-600 dark:bg-gray-800 dark:text-primary-400 font-medium' 
      : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-400';
  };

  // Get current page title
  const getPageTitle = () => {
    const route = ADMIN_ROUTES.find(r => r.path === location.pathname);
    return route ? route.name : 'Dashboard';
  };

  // Get breadcrumbs
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => ({
      name: path === 'admin' ? 'Dashboard' : path.charAt(0).toUpperCase() + path.slice(1),
      path: `/${paths.slice(0, index + 1).join('/')}`,
      current: index === paths.length - 1
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and Menu Toggle */}
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Logo */}
              <div className="flex items-center ml-2 lg:ml-0">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="hidden md:block ml-3">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">Eagles Events</h1>
                </div>
              </div>
            </div>

            {/* Center - Search Bar */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button className="p-2 rounded-lg text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800"></span>
                </button>
              </div>

              {/* Help */}
              <button className="hidden md:flex items-center p-2 rounded-lg text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <HelpCircle className="w-5 h-5" />
                <span className="ml-2 text-sm font-medium">Help</span>
              </button>

              {/* Profile Dropdown */}
              <div className="relative ml-2">
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center max-w-xs rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  id="user-menu"
                  aria-expanded="false"
                  aria-haspopup="true"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-medium">
                    {adminUser?.name?.charAt(0) || adminUser?.email?.charAt(0).toUpperCase() || 'A'}
                  </div>
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileDropdown && (
                  <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10" role="menu" aria-orientation="vertical" aria-labelledby="user-menu">
                    <div className="py-1" role="none">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-900 dark:text-white font-medium">{adminUser?.name || 'Admin User'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{adminUser?.email || 'admin@eagleevents.com'}</p>
                      </div>
                      <Link
                        to="/admin/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        role="menuitem"
                      >
                        <User className="mr-3 h-5 w-5 text-gray-400" />
                        Your Profile
                      </Link>
                      <Link
                        to="/admin/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        role="menuitem"
                      >
                        <Settings className="mr-3 h-5 w-5 text-gray-400" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700"
                        role="menuitem"
                      >
                        <LogOut className="mr-3 h-5 w-5 text-red-400" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                {!isSidebarCollapsed && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">Admin Panel</span>
                  </div>
                )}
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${
                    isSidebarCollapsed ? 'rotate-0' : 'rotate-180'
                  }`} />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {ADMIN_ROUTES.map((route) => {
                const IconComponent = route.icon;
                const active = isActive(route.path);
                const badge = route.path === '/admin/messages' && newMsgCount > 0 ? String(newMsgCount) : route.badge;
                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    className={`group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${getNavItemClasses(active)}`}
                    title={isSidebarCollapsed ? route.name : ''}
                  >
                    <div className="relative">
                      <IconComponent 
                        className={`w-5 h-5 flex-shrink-0 ${
                          active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 group-hover:text-primary-600 dark:text-gray-400 dark:group-hover:text-primary-400'
                        }`} 
                      />
                      {badge && (
                        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-red-500 text-white">
                          {badge}
                        </span>
                      )}
                    </div>
                    {!isSidebarCollapsed && (
                      <span className="ml-3 truncate">{route.name}</span>
                    )}
                    {active && !isSidebarCollapsed && (
                      <div className="ml-auto w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              {!isSidebarCollapsed ? (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {adminUser?.name || 'Admin User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {adminUser?.email || 'admin@eagleevents.com'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Breadcrumbs */}
            <nav className="flex mb-6" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-2">
                {getBreadcrumbs().map((breadcrumb, index) => (
                  <li key={breadcrumb.path} className="inline-flex items-center">
                    {index > 0 && (
                      <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
                    )}
                    {breadcrumb.current ? (
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {breadcrumb.name}
                      </span>
                    ) : (
                      <Link
                        to={breadcrumb.path}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        {breadcrumb.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getPageTitle()}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {getPageTitle() === 'Dashboard' 
                    ? 'Overview of your admin dashboard' 
                    : `Manage your ${getPageTitle().toLowerCase()} here`}
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Link
                  to={location.pathname + '/create'}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Add New
                </Link>
              </div>
            </div>

            {/* Page Content */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
