#!/usr/bin/env node

const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🚀 Ghana Code Library - Database Setup');
console.log('=======================================\n');

// Database connection configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  port: process.env.MYSQL_PORT || 3306,
  multipleStatements: true
};

// Create connection without database first
const connection = mysql.createConnection(dbConfig);

async function setupDatabase() {
  try {
    console.log('📡 Connecting to MySQL server...');
    
    // Connect to MySQL server
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) {
          console.error('❌ Failed to connect to MySQL server:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Connected to MySQL server successfully');
        resolve();
      });
    });

    // Create database if it doesn't exist
    const databaseName = process.env.MYSQL_DATABASE || 'iykelibrary';
    console.log(`🗄️  Creating database '${databaseName}' if it doesn't exist...`);
    
    await new Promise((resolve, reject) => {
      connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, (err) => {
        if (err) {
          console.error('❌ Failed to create database:', err.message);
          reject(err);
          return;
        }
        console.log(`✅ Database '${databaseName}' is ready`);
        resolve();
      });
    });

    // Use the database
    await new Promise((resolve, reject) => {
      connection.query(`USE \`${databaseName}\``, (err) => {
        if (err) {
          console.error('❌ Failed to use database:', err.message);
          reject(err);
          return;
        }
        console.log(`✅ Using database '${databaseName}'`);
        resolve();
      });
    });

    // Read and execute schema
    console.log('📖 Reading database schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found. Please ensure schema.sql exists in the project root.');
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('🔧 Executing database schema...');
    
    await new Promise((resolve, reject) => {
      connection.query(schema, (err) => {
        if (err) {
          console.error('❌ Failed to execute schema:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Database schema executed successfully');
        resolve();
      });
    });

    // Check if tables were created
    console.log('🔍 Verifying table creation...');
    const tables = await new Promise((resolve, reject) => {
      connection.query('SHOW TABLES', (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results.map(row => Object.values(row)[0]));
      });
    });

    console.log('📊 Created tables:', tables.join(', '));
    
    // Check if we have any data
    const bookCount = await new Promise((resolve, reject) => {
      connection.query('SELECT COUNT(*) as count FROM books', (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results[0]?.count || 0);
      });
    });

    const categoryCount = await new Promise((resolve, reject) => {
      connection.query('SELECT COUNT(*) as count FROM tutorials', (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results[0]?.count || 0);
      });
    });

    console.log(`📚 Books in database: ${bookCount}`);
    console.log(`🏷️  Tutorials in database: ${categoryCount}`);

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Start your server: npm run dev');
    console.log('   2. Access the admin panel');
    console.log('   3. Add your first book or category');

  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Ensure XAMPP MySQL service is running');
    console.log('   • Check your .env file configuration');
    console.log('   • Verify MySQL credentials');
    process.exit(1);
  } finally {
    connection.end();
  }
}

// Run the setup
setupDatabase();


