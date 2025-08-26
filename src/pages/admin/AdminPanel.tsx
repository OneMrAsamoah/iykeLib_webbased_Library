import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import useTheme from '@/hooks/use-theme';
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  BarChart3, 
  Activity, 
  Settings, 
  LogOut,
  User,
  LayoutDashboard,
  Tag,
  Menu,
  X,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { user, userProfile, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false; // Default to false (full view)
  });
  const { theme, toggle } = useTheme();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const toggleSidebarCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(newState));
  };

  // Keyboard shortcut for toggling sidebar collapse (Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        if (!isMobile) {
          toggleSidebarCollapse();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarCollapsed, isMobile]);

  // Close sidebar when switching from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

     const navigationItems = [
     { path: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
     { path: "/admin/books", label: "Books", icon: <BookOpen className="h-5 w-5" /> },
     { path: "/admin/categories", label: "Categories", icon: <Tag className="h-5 w-5" /> },
     { path: "/admin/tutorials", label: "Tutorials", icon: <GraduationCap className="h-5 w-5" /> },
     { path: "/admin/users", label: "Users", icon: <Users className="h-5 w-5" /> },
     { path: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
     { path: "/admin/activity-log", label: "Activity Log", icon: <Activity className="h-5 w-5" /> },
     { path: "/admin/settings", label: "Settings", icon: <Settings className="h-5 w-5" /> }
   ];

  const isActiveRoute = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const displayName = userProfile?.display_name || user?.email?.split('@')[0] || 'Admin';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        bg-gradient-to-b from-primary to-primary/80 text-white shadow-lg flex-shrink-0
        transform transition-all duration-300 ease-in-out
        ${isMobile ? (isSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        ${isSidebarCollapsed ? 'w-16' : 'w-64'}
        lg:translate-x-0
      `}>
        <div className="h-full flex flex-col">
          {/* Logo and Close Button */}
          <div className={`${isSidebarCollapsed ? 'p-4' : 'p-6'}`}>
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-8`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-2'}`}>
                    <BookOpen className={`${isSidebarCollapsed ? 'h-8 w-8' : 'h-8 w-8'} text-yellow-400 flex-shrink-0`} />
                    {!isSidebarCollapsed && (
                      <div>
                        <h1 className="text-2xl font-bold">iykeLib</h1>
                        <p className="text-sm text-yellow-400">Admin Dashboard</p>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                {isSidebarCollapsed && (
                  <TooltipContent side="right" className="bg-primary text-primary-foreground border-primary">
                    <div className="text-center">
                      <p className="font-bold">iykeLib</p>
                      <p className="text-sm">Admin Dashboard</p>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
              {/* Close button for mobile */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeSidebar}
                  className="lg:hidden text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2' : 'px-6'} pb-6`}>
            <TooltipProvider delayDuration={0}>
              <div className="space-y-2">
                {navigationItems.map((item) => (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        onClick={isMobile ? closeSidebar : undefined}
                        className={`flex items-center transition-all duration-200 hover:bg-white/10 active:bg-white/20 rounded-lg ${
                          isActiveRoute(item.path)
                            ? 'bg-white/20 border-l-4 border-yellow-400'
                            : 'hover:bg-white/10'
                        } ${
                          isSidebarCollapsed 
                            ? 'justify-center px-2 py-3' 
                            : 'space-x-3 px-4 py-3'
                        }`}
                      >
                        <div className={`flex-shrink-0 ${
                          isSidebarCollapsed ? 'h-6 w-6' : 'h-5 w-5'
                        }`}>
                          {item.icon}
                        </div>
                        {!isSidebarCollapsed && (
                          <span className="font-medium">{item.label}</span>
                        )}
                      </Link>
                    </TooltipTrigger>
                    {isSidebarCollapsed && (
                      <TooltipContent side="right" className="bg-primary text-primary-foreground border-primary">
                        <p>{item.label}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b bg-background flex-shrink-0">
          {/* Hamburger Menu and Page Title */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="lg:hidden p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-xl lg:text-3xl font-bold text-foreground">
                  {location.pathname === "/admin" ? "Dashboard" : 
                   location.pathname.includes("/books") ? "Books" :
                   location.pathname.includes("/categories") ? "Categories" :
                   location.pathname.includes("/tutorials") ? "Tutorials" :
                   location.pathname.includes("/users") ? "Users" :
                   location.pathname.includes("/analytics") ? "Analytics" :
                   location.pathname.includes("/activity-log") ? "Activity Log" :
                   location.pathname.includes("/settings") ? "Settings" :
                   "Admin Panel"}
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {location.pathname === "/admin" ? "Welcome to iykeLib Admin Panel" :
                   location.pathname.includes("/books") ? "Manage your library collection" :
                   location.pathname.includes("/categories") ? "Organize your content with categories" :
                   location.pathname.includes("/tutorials") ? "Manage your tutorial content" :
                   location.pathname.includes("/users") ? "Manage user accounts and permissions" :
                   location.pathname.includes("/analytics") ? "View insights and statistics" :
                   location.pathname.includes("/activity-log") ? "Monitor system activity" :
                   location.pathname.includes("/settings") ? "Configure system settings" :
                   "Admin Panel"}
                </p>
              </div>
            </div>
          </div>

          {/* Theme Toggle and Profile Avatar */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              className="p-2"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* Profile Avatar with Hover Menu */}
            <div className="relative group">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 p-2 h-auto hover:bg-accent/50">
                    <Avatar className="h-8 w-8 lg:h-10 lg:w-10">
                      <AvatarImage src={user?.user_metadata?.avatar_url} alt={displayName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                        {getInitials(userProfile?.display_name || null, userProfile?.email || user?.email || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden lg:flex flex-col items-start text-left">
                      <span className="text-sm font-medium leading-none">{displayName}</span>
                      <span className="text-xs text-muted-foreground leading-none">Admin</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {userProfile?.email || user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  
                  <DropdownMenuSeparator />

                  {/* Link to main site for admins to quickly jump back to the public-facing pages */}
                  <DropdownMenuItem asChild>
                    <Link to="/" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Main page</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Outlet for nested routes */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
