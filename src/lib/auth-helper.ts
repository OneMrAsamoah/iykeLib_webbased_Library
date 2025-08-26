// Authentication helper for testing and development

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

// Set user authentication data
export const setAuthUser = (user: AuthUser) => {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('userEmail', user.email);
  
  // Dispatch custom event for auth state change
  window.dispatchEvent(new CustomEvent('signin', { 
    detail: { 
      user, 
      session: { user } 
    } 
  }));
  
  console.log('✅ Authentication data set:', user);
};

// Get current authenticated user
export const getAuthUser = (): AuthUser | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Get user email for API calls
export const getUserEmail = (): string | null => {
  return localStorage.getItem('userEmail') || 
         localStorage.getItem('user') ? 
         JSON.parse(localStorage.getItem('user') || '{}')?.email : null;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getUserEmail() !== null;
};

// Clear authentication data
export const clearAuth = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('session');
  
  // Clear any admin role data
  const user = getAuthUser();
  if (user?.email) {
    localStorage.removeItem(`admin_role_${user.email}`);
  }
  
  console.log('✅ Authentication data cleared');
};

// Set admin role for testing
export const setAdminRole = (email: string) => {
  localStorage.setItem(`admin_role_${email}`, 'admin');
  console.log(`✅ Admin role set for: ${email}`);
};

// Check if user has admin role
export const hasAdminRole = (email: string): boolean => {
  return localStorage.getItem(`admin_role_${email}`) === 'admin';
};

// Development helper: Quick admin setup
export const setupTestAdmin = () => {
  const testUser: AuthUser = {
    id: '1',
    email: 'admin@test.com',
    username: 'admin',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin'
  };
  
  setAuthUser(testUser);
  setAdminRole(testUser.email);
  
  console.log('🎉 Test admin user setup complete!');
  console.log('📧 Email:', testUser.email);
  console.log('🔑 You can now access admin features');
  
  return testUser;
};

// Development helper: Quick user setup
export const setupTestUser = () => {
  const testUser: AuthUser = {
    id: '2',
    email: 'user@test.com',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    role: 'user'
  };
  
  setAuthUser(testUser);
  
  console.log('🎉 Test user setup complete!');
  console.log('📧 Email:', testUser.email);
  
  return testUser;
};

// Export to window for console access in development
if (typeof window !== 'undefined') {
  (window as any).authHelper = {
    setAuthUser,
    getAuthUser,
    getUserEmail,
    isAuthenticated,
    clearAuth,
    setAdminRole,
    hasAdminRole,
    setupTestAdmin,
    setupTestUser
  };
}

