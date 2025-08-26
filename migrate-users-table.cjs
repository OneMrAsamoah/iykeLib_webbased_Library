#!/usr/bin/env node

const mysql = require('mysql2');
require('dotenv').config();

console.log('🔧 Migrating Users Table');
console.log('=========================\n');

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

async function migrateUsersTable() {
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
    
    console.log('✅ Users table exists');
    
    // Check current table structure
    const [columns] = await connection.promise().query('DESCRIBE users');
    console.log('📋 Current columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    // Add missing columns if they don't exist
    const missingColumns = [];
    
    // Check for is_active column
    const hasIsActive = columns.some(col => col.Field === 'is_active');
    if (!hasIsActive) {
      missingColumns.push('is_active');
    }
    
    // Check for last_login column
    const hasLastLogin = columns.some(col => col.Field === 'last_login');
    if (!hasLastLogin) {
      missingColumns.push('last_login');
    }
    
    // Check for profile_image column
    const hasProfileImage = columns.some(col => col.Field === 'profile_image');
    if (!hasProfileImage) {
      missingColumns.push('profile_image');
    }
    
    if (missingColumns.length === 0) {
      console.log('✅ All required columns already exist');
      return;
    }
    
    console.log(`🔧 Adding missing columns: ${missingColumns.join(', ')}`);
    
    // Add is_active column
    if (!hasIsActive) {
      console.log('➕ Adding is_active column...');
      await connection.promise().query(
        'ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE'
      );
      console.log('✅ Added is_active column');
    }
    
    // Add last_login column
    if (!hasLastLogin) {
      console.log('➕ Adding last_login column...');
      await connection.promise().query(
        'ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL'
      );
      console.log('✅ Added last_login column');
    }
    
    // Add profile_image column
    if (!hasProfileImage) {
      console.log('➕ Adding profile_image column...');
      await connection.promise().query(
        'ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) NULL'
      );
      console.log('✅ Added profile_image column');
    }
    
    // Check if download_logs table exists, if not create it
    const [downloadLogsTables] = await connection.promise().query('SHOW TABLES LIKE "download_logs"');
    if (downloadLogsTables.length === 0) {
      console.log('➕ Creating download_logs table...');
      await connection.promise().query(`
        CREATE TABLE download_logs (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id INT UNSIGNED NULL,
          book_id INT UNSIGNED NULL,
          tutorial_id INT UNSIGNED NULL,
          downloaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          PRIMARY KEY (id),
          INDEX idx_user_id (user_id),
          INDEX idx_book_id (book_id),
          INDEX idx_tutorial_id (tutorial_id),
          INDEX idx_downloaded_at (downloaded_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Created download_logs table');
    }
    
    // Check if view_logs table exists, if not create it
    const [viewLogsTables] = await connection.promise().query('SHOW TABLES LIKE "view_logs"');
    if (viewLogsTables.length === 0) {
      console.log('➕ Creating view_logs table...');
      await connection.promise().query(`
        CREATE TABLE view_logs (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id INT UNSIGNED NULL,
          book_id INT UNSIGNED NULL,
          tutorial_id INT UNSIGNED NULL,
          viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          PRIMARY KEY (id),
          INDEX idx_user_id (user_id),
          INDEX idx_book_id (book_id),
          INDEX idx_tutorial_id (tutorial_id),
          INDEX idx_viewed_at (viewed_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Created view_logs table');
    }
    
    // Show final table structure
    const [finalColumns] = await connection.promise().query('DESCRIBE users');
    console.log('\n📋 Final table structure:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('💡 Your users table now has all required columns for the admin panel');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    connection.end();
  }
}

// Run the migration
migrateUsersTable();
