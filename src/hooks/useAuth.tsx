import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  user_metadata?: {
    display_name?: string;
    avatar_url?: string;
  };
}

interface Session {
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;

  createProfile: () => Promise<void>;
  setAdminRole: (email: string) => void;
  refreshUserRole: () => Promise<string | null>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);



  const createProfile = async () => {
    if (!user) {
      console.log('No user logged in');
      return;
    }

    console.log('Creating profile for user:', user.id);
    console.log('MySQL integration not yet implemented');
    
    // TODO: Implement MySQL profile creation
    const mockProfile: UserProfile = {
      id: Date.now().toString(),
      user_id: user.id,
      email: user.email,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
      created_at: new Date().toISOString()
    };
    
    setUserProfile(mockProfile);
    setUserRole('user');
  };

  const setAdminRole = (email: string) => {
    console.log('Setting admin role for email:', email);
    localStorage.setItem(`admin_role_${email}`, 'admin');
    if (user?.email === email) {
      console.log('Updating userRole to admin for current user');
      setUserRole('admin');
    }
  };

  const fetchUserData = async (userId: string, userData?: User) => {
    try {
      console.log('Fetching user data for:', userId);
      
      // Use the passed userData or fall back to current user state
      const currentUser = userData || user;
      console.log('Current user for profile creation:', currentUser);

      // Check if user is admin by email (temporary solution until backend is implemented)
      let resolvedRole: string = 'user';
      if (currentUser?.email) {
        // Check localStorage for admin role first
        const storedRole = localStorage.getItem(`admin_role_${currentUser.email}`);
        if (storedRole === 'admin') {
          resolvedRole = 'admin';
          console.log('Found admin role in localStorage for:', currentUser.email);
        } else {
          // Try to fetch role from backend
          try {
            const res = await fetch(`/api/users/role?email=${encodeURIComponent(currentUser.email)}`);
            if (res.ok) {
              const data = await res.json();
              resolvedRole = data?.role ?? 'user';
              // Store the role in localStorage for persistence
              localStorage.setItem(`admin_role_${currentUser.email}`, resolvedRole);
              console.log('Fetched role from backend:', resolvedRole);
            }
          } catch (error) {
            console.log('Backend role fetch failed, using default role');
          }
        }
      }

      // For now, synthesize a minimal profile and apply resolved role
      const profile: UserProfile = {
        id: Date.now().toString(),
        user_id: userId,
        email: currentUser?.email || 'user@example.com',
        display_name: currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'User',
        created_at: new Date().toISOString()
      };

      console.log('Created profile with display_name:', profile.display_name);
      console.log('User metadata:', currentUser?.user_metadata);
      console.log('User email:', currentUser?.email);

      setUserProfile(profile);
      setUserRole(resolvedRole);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      // Always set loading to false after fetching user data
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const refreshUserRole = async (): Promise<string | null> => {
    try {
      if (!user?.email) return null;
      const res = await fetch(`/api/users/role?email=${encodeURIComponent(user.email)}`);
      if (!res.ok) return userRole;
      const data = await res.json();
      const resolved = data?.role ?? null;
      if (resolved) {
        localStorage.setItem(`admin_role_${user.email}`,'admin' === resolved ? 'admin' : resolved);
        setUserRole(resolved);
      } else {
        localStorage.removeItem(`admin_role_${user.email}`);
        setUserRole('user');
      }
      return resolved;
    } catch (e) {
      console.log('Failed to refresh user role from server');
      return userRole;
    }
  };

  const refreshUserData = async () => {
    if (!user) return;
    console.log('Refreshing user data for:', user.id);
    await fetchUserData(user.id, user);
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        console.log('MySQL integration not yet implemented');
        
        // TODO: Implement MySQL session management
        // For now, check localStorage for existing session
        const storedUser = localStorage.getItem('user');
        const storedSession = localStorage.getItem('session');
        
        if (mounted && storedUser && storedSession) {
          const userData = JSON.parse(storedUser);
          const sessionData = JSON.parse(storedSession);
          
          console.log('Loaded user from localStorage:', userData);
          console.log('User metadata from localStorage:', userData.user_metadata);
          
          setUser(userData);
          setSession(sessionData);
          
          if (userData) {
            // fetchUserData will handle setting isLoading to false
            // Pass userData directly to avoid state timing issues
            await fetchUserData(userData.id, userData);
          }
        } else {
          // No stored session, set loading to false immediately
          if (mounted) {
            setIsLoading(false);
            setIsInitialized(true);
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Listen for localStorage changes to handle new sign-ins
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        console.log('User data changed in localStorage, updating auth state');
        try {
          const userData = JSON.parse(e.newValue);
          const sessionData = localStorage.getItem('session');
          
          if (sessionData && mounted) {
            const session = JSON.parse(sessionData);
            setUser(userData);
            setSession(session);
            fetchUserData(userData.id, userData);
          }
        } catch (error) {
          console.error('Error parsing user data from storage change:', error);
        }
      }
    };

    // Listen for custom events when sign-in happens in the same tab
    const handleSignIn = (e: CustomEvent) => {
      if (mounted && e.detail?.user) {
        console.log('Sign-in event received, updating auth state');
        const { user: userData, session: sessionData } = e.detail;
        setUser(userData);
        setSession(sessionData);
        fetchUserData(userData.id, userData);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('signin', handleSignIn as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('signin', handleSignIn as EventListener);
    };
  }, []);

  const signOut = async () => {
    // TODO: Implement MySQL sign out
    console.log('MySQL sign out not yet implemented');
    
    // Clear local storage
    localStorage.removeItem('user');
    localStorage.removeItem('session');
    
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserProfile(null);
  };

  const isAdmin = userRole === 'admin' || Boolean(user?.email && localStorage.getItem(`admin_role_${user.email}`) === 'admin');

  // Debug logging
  useEffect(() => {
    console.log('Auth context state:', {
      user: !!user,
      userProfile: !!userProfile,
      userRole,
      isAdmin,
      isLoading,
      isInitialized
    });
  }, [user, userProfile, userRole, isAdmin, isLoading, isInitialized]);

  // Log loading state changes
  useEffect(() => {
    console.log('Loading state changed:', { isLoading, isInitialized });
  }, [isLoading, isInitialized]);

  // Log userRole and isAdmin changes
  useEffect(() => {
    console.log('User role or admin status changed:', { userRole, isAdmin, userEmail: user?.email });
  }, [userRole, isAdmin, user?.email]);

  // Development helper: Add setAdminRole to window for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).setAdminRole = (email: string) => {
        console.log('Setting admin role for:', email);
        setAdminRole(email);
      };
      (window as any).getAuthState = () => ({
        user: !!user,
        userProfile: !!userProfile,
        userRole,
        isAdmin,
        isLoading,
        isInitialized
      });
      (window as any).refreshAuthData = () => {
        console.log('Manually refreshing auth data');
        if (user) {
          refreshUserData();
        }
      };
    }
  }, [user, userProfile, userRole, isAdmin, isLoading, isInitialized, refreshUserData]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      userProfile,
      isLoading,
      isAdmin,
      signOut,
      createProfile,
      setAdminRole,
      refreshUserRole,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}