export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'user' | 'moderator' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'moderator' | 'admin';
  password: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: 'user' | 'moderator' | 'admin';
}

import { getUserEmail } from './auth-helper';

// Fetch all users
export const fetchUsers = async (): Promise<User[]> => {
  try {
    // Get user email from auth helper
    const userEmail = getUserEmail();
    
    if (!userEmail) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/admin/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
};

// Create a new user
export const createUser = async (userData: CreateUserData): Promise<User> => {
  try {
    // Get user email from auth helper
    const userEmail = getUserEmail();
    
    if (!userEmail) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
      },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create user');
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Update an existing user
export const updateUser = async (userId: string, userData: UpdateUserData): Promise<User> => {
  try {
    // Get user email from auth helper
    const userEmail = getUserEmail();
    
    if (!userEmail) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
      },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update user');
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Delete a user
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    // Get user email from auth helper
    const userEmail = getUserEmail();
    
    if (!userEmail) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete user');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Update user status (activate/deactivate)
export const updateUserStatus = async (userId: string, isActive: boolean): Promise<void> => {
  try {
    // Get user email from auth helper
    const userEmail = getUserEmail();
    
    if (!userEmail) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
      },
      credentials: 'include',
      body: JSON.stringify({ is_active: isActive }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update user status');
    }
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

// Update user role
export const updateUserRole = async (userId: string, role: 'user' | 'moderator' | 'admin'): Promise<void> => {
  try {
    // Get user email from auth helper
    const userEmail = getUserEmail();
    
    if (!userEmail) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
      },
      credentials: 'include',
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update user role');
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Get user statistics
export const getUserStats = async (): Promise<{
  total_users: number;
  active_users: number;
  inactive_users: number;
  users_by_role: Record<string, number>;
}> => {
  try {
    // Get user email from auth helper
    const userEmail = getUserEmail();
    
    if (!userEmail) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/admin/users/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw new Error('Failed to fetch user statistics');
  }
};

// Search users
export const searchUsers = async (query: string, filters?: {
  role?: string;
  status?: string;
}): Promise<User[]> => {
  try {
    // Get user email from auth helper
    const userEmail = getUserEmail();
    
    if (!userEmail) {
      throw new Error('User not authenticated');
    }

    const params = new URLSearchParams({ q: query });
    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);

    const response = await fetch(`/api/admin/users/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Error searching users:', error);
    throw new Error('Failed to search users');
  }
};
