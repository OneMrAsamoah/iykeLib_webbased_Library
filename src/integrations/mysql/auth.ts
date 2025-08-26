import { pool } from './config';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export interface MySQLUser {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MySQLUserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MySQLUserRole {
  id: string;
  user_id: string;
  role: 'user' | 'moderator' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export class MySQLAuthService {
  // User registration
  static async registerUser(email: string, password: string, displayName?: string): Promise<MySQLUser> {
    const connection = await pool.getConnection();
    
    try {
      // Check if user already exists
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      
      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password with configurable salt rounds
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Generate user ID
      const userId = uuidv4();
      
      // Insert user
      await connection.execute(
        'INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
        [userId, email, passwordHash, displayName || null]
      );

      // Create user profile
      await connection.execute(
        'INSERT INTO user_profiles (id, user_id, display_name, email) VALUES (?, ?, ?, ?)',
        [uuidv4(), userId, displayName || null, email]
      );

      // Create user role (default: user)
      await connection.execute(
        'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
        [uuidv4(), userId, 'user']
      );

      // Return created user
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      return (users as any[])[0];
    } finally {
      connection.release();
    }
  }

  // User login
  static async loginUser(email: string, password: string): Promise<MySQLUser | null> {
    const connection = await pool.getConnection();
    
    try {
      // Find user by email
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if (!Array.isArray(users) || users.length === 0) {
        return null;
      }

      const user = users[0] as MySQLUser;
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        return null;
      }

      return user;
    } finally {
      connection.release();
    }
  }

  // Get user profile
  static async getUserProfile(userId: string): Promise<MySQLUserProfile | null> {
    const connection = await pool.getConnection();
    
    try {
      const [profiles] = await connection.execute(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId]
      );
      
      if (!Array.isArray(profiles) || profiles.length === 0) {
        return null;
      }

      return profiles[0] as MySQLUserProfile;
    } finally {
      connection.release();
    }
  }

  // Get user role
  static async getUserRole(userId: string): Promise<MySQLUserRole | null> {
    const connection = await pool.getConnection();
    
    try {
      const [roles] = await connection.execute(
        'SELECT * FROM user_roles WHERE user_id = ?',
        [userId]
      );
      
      if (!Array.isArray(roles) || roles.length === 0) {
        return null;
      }

      return roles[0] as MySQLUserRole;
    } finally {
      connection.release();
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<MySQLUserProfile>): Promise<void> {
    const connection = await pool.getConnection();
    
    try {
      const updateFields = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'user_id' && key !== 'created_at')
        .map(key => `${key} = ?`);
      
      const updateValues = Object.values(updates).filter((_, index) => 
        Object.keys(updates)[index] !== 'id' && 
        Object.keys(updates)[index] !== 'user_id' && 
        Object.keys(updates)[index] !== 'created_at'
      );
      
      if (updateFields.length === 0) return;
      
      const query = `UPDATE user_profiles SET ${updateFields.join(', ')} WHERE user_id = ?`;
      await connection.execute(query, [...updateValues, userId]);
    } finally {
      connection.release();
    }
  }

  // Update user role
  static async updateUserRole(userId: string, newRole: 'user' | 'moderator' | 'admin'): Promise<void> {
    const connection = await pool.getConnection();
    
    try {
      await connection.execute(
        'UPDATE user_roles SET role = ? WHERE user_id = ?',
        [newRole, userId]
      );
    } finally {
      connection.release();
    }
  }

  // Get all users (for admin)
  static async getAllUsers(): Promise<Array<MySQLUser & { role: string; profile: MySQLUserProfile | null }>> {
    const connection = await pool.getConnection();
    
    try {
      const [users] = await connection.execute(`
        SELECT 
          u.*,
          ur.role,
          up.display_name as profile_display_name,
          up.email as profile_email,
          up.created_at as profile_created_at,
          up.updated_at as profile_updated_at
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        ORDER BY u.created_at DESC
      `);
      
      return (users as any[]).map(user => ({
        id: user.id,
        email: user.email,
        password_hash: user.password_hash,
        display_name: user.display_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
        role: user.role || 'user',
        profile: user.profile_display_name ? {
          id: user.id,
          user_id: user.id,
          display_name: user.profile_display_name,
          email: user.profile_email,
          created_at: user.profile_created_at,
          updated_at: user.profile_updated_at
        } : null
      }));
    } finally {
      connection.release();
    }
  }
}

export default MySQLAuthService;
