import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import useTheme from "@/hooks/use-theme";
import { useAuth } from "@/hooks/useAuth";
import ProfileAvatar from "./ProfileAvatar";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, userProfile, isLoading, isAdmin, createProfile, refreshUserData } = useAuth();

  // Refresh user data if user is logged in but profile is missing
  useEffect(() => {
    if (user && !userProfile && !isLoading) {
      console.log('User logged in but profile missing, refreshing user data');
      refreshUserData();
    }
  }, [user, userProfile, isLoading, refreshUserData]);

  // Debug logging
  useEffect(() => {
    console.log('Header auth state:', { user: !!user, userProfile: !!userProfile, isLoading, isAdmin });
  }, [user, userProfile, isLoading, isAdmin]);

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Books", href: "/books" },
    { name: "Categories", href: "/categories" },
    { name: "Tutorials", href: "/tutorials" },
    { name: "About", href: "/about" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              iYKELib
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Auth Buttons (desktop only) + theme toggle */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Loading...</span>
              </div>
            )}



            {/* Create Profile button (only show when user is logged in but has no profile) */}
            {user && !userProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={createProfile}
                title="Create Profile"
                className="text-xs"
              >
                Create Profile
              </Button>
            )}

            {/* Desktop theme toggle */}
            <button
              aria-label="Toggle theme"
              onClick={toggle}
              title="Toggle theme"
              className="p-2 rounded-md hover:bg-muted flex items-center"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {user ? (
              <ProfileAvatar />
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium px-2 py-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex flex-col space-y-2 pt-3 border-t">
                {/* Loading indicator for mobile */}
                {isLoading && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground px-2 py-1">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Loading...</span>
                  </div>
                )}



                {/* Create Profile button for mobile */}
                {user && !userProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      createProfile();
                      setIsMobileMenuOpen(false);
                    }}
                    className="justify-start w-full"
                  >
                    Create Profile
                  </Button>
                )}

                {/* Mobile-only theme toggle */}
                <button
                  aria-label="Toggle theme"
                  onClick={toggle}
                  className="p-2 rounded-md hover:bg-muted flex items-center justify-start w-full"
                  title="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5 mr-2" /> : <Moon className="h-5 w-5 mr-2" />}
                  <span className="text-sm font-medium">Toggle theme</span>
                </button>

                {user ? (
                  <div className="px-2 py-1">
                    <ProfileAvatar />
                  </div>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="justify-start w-full">
                        Login
                      </Button>
                    </Link>
                    <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button size="sm" className="justify-start w-full">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;