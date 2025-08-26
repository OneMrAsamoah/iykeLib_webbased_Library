#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Ghana Code Library - Environment Setup');
console.log('==========================================\n');
console.log('⚠️  All MySQL configuration variables are REQUIRED for the application to work!\n');

const questions = [
  {
    name: 'MYSQL_HOST',
    message: 'MySQL Host (REQUIRED): ',
    default: 'localhost',
    required: true
  },
  {
    name: 'MYSQL_USER',
    message: 'MySQL User (REQUIRED): ',
    default: 'root',
    required: true
  },
  {
    name: 'MYSQL_PASSWORD',
    message: 'MySQL Password (leave empty if none): ',
    default: '',
    required: false
  },
  {
    name: 'MYSQL_DATABASE',
    message: 'MySQL Database Name (REQUIRED): ',
    default: 'ghana_code_library',
    required: true
  },
  {
    name: 'MYSQL_PORT',
    message: 'MySQL Port (REQUIRED): ',
    default: '3306',
    required: true
  },
  {
    name: 'BCRYPT_SALT_ROUNDS',
    message: 'BCrypt Salt Rounds (REQUIRED): ',
    default: '12',
    required: true
  },
  {
    name: 'JWT_SECRET',
    message: 'JWT Secret (REQUIRED - generate a strong random string): ',
    default: generateRandomString(32),
    required: true
  }
];

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function askQuestion(question) {
  return new Promise((resolve) => {
    const message = question.required ? 
      `${question.message} (REQUIRED)` : 
      question.message;
    
    rl.question(message, (answer) => {
      const value = answer.trim() || question.default;
      
      // Validate required fields
      if (question.required && !value) {
        console.log('❌ This field is required! Please provide a value.');
        return askQuestion(question);
      }
      
      resolve(value);
    });
  });
}

async function setupEnvironment() {
  const envVars = {};
  
  console.log('📝 Setting up environment variables...\n');
  
  for (const question of questions) {
    envVars[question.name] = await askQuestion(question);
  }
  
  // Build .env content
  const envContent = `# ========================================
# Ghana Code Library - Environment Configuration
# ========================================
# Generated on: ${new Date().toISOString()}
# DO NOT commit this file to version control

# ========================================
# MySQL Database Configuration (REQUIRED)
# ========================================
MYSQL_HOST=${envVars.MYSQL_HOST}
MYSQL_USER=${envVars.MYSQL_USER}
MYSQL_PASSWORD=${envVars.MYSQL_PASSWORD}
MYSQL_DATABASE=${envVars.MYSQL_DATABASE}
MYSQL_PORT=${envVars.MYSQL_PORT}

# ========================================
# Application Configuration (REQUIRED)
# ========================================
NODE_ENV=development
VITE_APP_TITLE=Ghana Code Library
VITE_APP_VERSION=1.0.0

# ========================================
# Security Configuration (REQUIRED)
# ========================================
BCRYPT_SALT_ROUNDS=${envVars.BCRYPT_SALT_ROUNDS}
JWT_SECRET=${envVars.JWT_SECRET}
JWT_EXPIRES_IN=7d

# ========================================
# Server Configuration (OPTIONAL)
# ========================================
PORT=3000
HOST=localhost
`;

  // Write .env file
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Environment file created successfully!');
    console.log(`📁 Location: ${envPath}`);
    console.log('\n🔒 Important: Add .env to your .gitignore file to keep secrets safe!');
    
    // Check if .gitignore exists and contains .env
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      if (!gitignoreContent.includes('.env')) {
        console.log('\n⚠️  Warning: .env is not in your .gitignore file!');
        console.log('   Consider adding it to prevent accidentally committing secrets.');
      }
    } else {
      console.log('\n⚠️  Warning: No .gitignore file found!');
      console.log('   Consider creating one and adding .env to it.');
    }
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Start your MySQL server (XAMPP)');
    console.log('   2. Create the database: ghana_code_library');
    console.log('   3. Run: npm run dev');
    
  } catch (error) {
    console.error('\n❌ Error creating .env file:', error.message);
    process.exit(1);
  }
  
  rl.close();
}

// Check if .env already exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  rl.question('.env file already exists. Overwrite? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      setupEnvironment();
    } else {
      console.log('Setup cancelled.');
      rl.close();
    }
  });
} else {
  setupEnvironment();
}
