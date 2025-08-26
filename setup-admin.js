#!/usr/bin/env node

const mysql = require('mysql2');
require('dotenv').config();

console.log('🔧 Setting up Admin User for Testing');
console.log('=====================================\n');

// Database connection configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'iykelibrary',
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
};

// Create connection
const connection = mysql.createConnection(dbConfig);

async function setupAdminUser() {
  try {
    console.log('📡 Connecting to MySQL database...');
    
    // Connect to MySQL server
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Connected to MySQL database successfully');
    
    // Check if users table exists
    const [tables] = await connection.promise().query('SHOW TABLES LIKE "users"');
    if (tables.length === 0) {
      console.log('❌ Users table does not exist. Please run the database setup first.');
      return;
    }
    
    // Check if roles table exists
    const [roleTables] = await connection.promise().query('SHOW TABLES LIKE "roles"');
    if (roleTables.length === 0) {
      console.log('❌ Roles table does not exist. Please run the database setup first.');
      return;
    }
    
    // Check if user_roles table exists
    const [userRoleTables] = await connection.promise().query('SHOW TABLES LIKE "user_roles"');
    if (userRoleTables.length === 0) {
      console.log('❌ User_roles table does not exist. Please run the database setup first.');
      return;
    }
    
    console.log('✅ All required tables exist');
    
    // Create admin role if it doesn't exist
    console.log('🔑 Creating admin role...');
    const [adminRole] = await connection.promise().query(
      'INSERT INTO roles (name) VALUES (?) ON DUPLICATE KEY UPDATE name = name',
      ['admin']
    );
    
    let adminRoleId;
    if (adminRole.insertId) {
      adminRoleId = adminRole.insertId;
      console.log('✅ Created admin role with ID:', adminRoleId);
    } else {
      // Get existing admin role ID
      const [existingRole] = await connection.promise().query('SELECT id FROM roles WHERE name = ?', ['admin']);
      adminRoleId = existingRole[0].id;
      console.log('✅ Found existing admin role with ID:', adminRoleId);
    }
    
    // Create test admin user
    const testEmail = 'admin@test.com';
    const testPassword = 'admin123';
    const testUsername = 'admin';
    
    console.log('👤 Creating test admin user...');
    
    // Check if user already exists
    const [existingUser] = await connection.promise().query('SELECT id FROM users WHERE email = ?', [testEmail]);
    
    if (existingUser.length > 0) {
      console.log('⚠️  User already exists, updating role...');
      const userId = existingUser[0].id;
      
      // Update user role to admin
      await connection.promise().query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
      await connection.promise().query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, adminRoleId]);
      
      console.log('✅ Updated existing user to admin role');
    } else {
      // Create new user
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync(testPassword, 12);
      
             const [newUser] = await connection.promise().query(
         'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
         [testUsername, testEmail, hashedPassword, 'Admin', 'User']
       );
      
      const userId = newUser.insertId;
      
      // Assign admin role
      await connection.promise().query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, adminRoleId]);
      
      console.log('✅ Created new admin user with ID:', userId);
    }
    
    console.log('\n🎉 Admin user setup complete!');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Password:', testPassword);
    console.log('👤 Username:', testUsername);
    console.log('\n💡 You can now use these credentials to test the admin panel');
    console.log('💡 Make sure to set the user email in localStorage for authentication');
    
  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
  } finally {
    connection.end();
  }
}

// Run the setup
setupAdminUser();
