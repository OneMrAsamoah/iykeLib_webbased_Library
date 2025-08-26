# MySQL Setup Guide

This project has been migrated from Supabase to MySQL. Follow these steps to set up your MySQL database.

## Prerequisites

- XAMPP (or standalone MySQL server)
- Node.js and npm
- Git

## Database Setup

### 1. Start MySQL Server

If using XAMPP:
1. Open XAMPP Control Panel
2. Start Apache and MySQL services
3. Click "Admin" next to MySQL to open phpMyAdmin

### 2. Create Database

1. Open phpMyAdmin (http://localhost/phpmyadmin)
2. Click "New" in the left sidebar
3. Enter database name: `ghana_code_library`
4. Click "Create"

### 3. Environment Variables

**Option A: Automatic Setup (Recommended)**
```bash
npm run setup-env
```
This will guide you through creating the `.env` file interactively.

**Option B: Manual Setup**
Create a `.env` file in your project root:

```env
# MySQL Database Configuration (REQUIRED)
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=ghana_code_library
MYSQL_PORT=3306

# Application Configuration (REQUIRED)
NODE_ENV=development
VITE_APP_TITLE=Ghana Code Library
VITE_APP_VERSION=1.0.0

# Security Configuration (REQUIRED)
BCRYPT_SALT_ROUNDS=12
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server Configuration (OPTIONAL)
PORT=3000
HOST=localhost
```

**⚠️  Important Security Notes:**
- **All MySQL configuration variables are REQUIRED** - the application will not start without them
- **Never commit `.env` files to version control**
- **Change the JWT_SECRET to a strong, random string**
- **Use strong passwords for MySQL in production**
- **The `.env` file is already added to `.gitignore`**

### 4. Initialize Database Tables

The application will automatically create all necessary tables when it first connects to the database. The table structure includes:

- `users` - User accounts with encrypted passwords
- `user_profiles` - User profile information
- `user_roles` - User role management (user, moderator, admin)
- `categories` - Content categories
- `books` - Digital books library
- `tutorials` - Video tutorials
- `certificates` - Certification programs
- `test_questions` - Quiz questions for certificates
- `test_attempts` - User test attempts
- `user_certificates` - Earned certificates

## Authentication System

The new MySQL-based authentication system provides:

- **User Registration**: Secure password hashing with bcrypt (configurable salt rounds)
- **User Login**: Email/password authentication
- **Role Management**: User, moderator, and admin roles
- **Profile Management**: User profile updates
- **Session Management**: Local storage-based sessions (can be enhanced with JWT)

## Migration from Supabase

### What Was Removed:
- `@supabase/supabase-js` dependency
- Supabase client configuration
- Supabase database types
- Supabase migration files

### What Was Added:
- `mysql2` for database connectivity
- `uuid` for unique ID generation
- `bcryptjs` for password hashing
- MySQL configuration and connection pooling
- MySQL authentication service
- Database table initialization scripts
- **Environment-based configuration**
- **Security best practices**

### What Needs Implementation:
- **Backend API**: The current implementation uses mock data. You'll need to create a backend API (Node.js/Express) to handle database operations.
- **JWT Tokens**: For production, implement JWT-based authentication instead of localStorage.
- **Password Reset**: Email-based password reset functionality.
- **Email Verification**: Email verification for new accounts.

## Development Workflow

1. **Start MySQL**: Ensure MySQL is running via XAMPP
2. **Set Environment**: Run `npm run setup-env` or create `.env` manually
3. **Run Application**: `npm run dev`
4. **Database Initialization**: Tables will be created automatically on first connection

## Security Features

- **Environment Variables**: All sensitive configuration moved to `.env` files
- **Strict Requirements**: MySQL configuration variables are mandatory - no fallback defaults
- **Password Hashing**: Configurable bcrypt salt rounds
- **JWT Secrets**: Strong, randomly generated secrets
- **Database Security**: No hardcoded credentials
- **Input Validation**: Prepared statements for all database queries

## Environment Variable Requirements

The application now **requires** all MySQL configuration variables to be set in your `.env` file:

**Required Variables (Application will not start without these):**
- `MYSQL_HOST` - MySQL server hostname
- `MYSQL_USER` - MySQL username
- `MYSQL_DATABASE` - Database name
- `MYSQL_PORT` - MySQL port number
- `BCRYPT_SALT_ROUNDS` - Password hashing strength
- `JWT_SECRET` - Secret key for JWT tokens

**Optional Variables:**
- `MYSQL_PASSWORD` - MySQL password (can be empty for local development)
- `PORT` - Application port
- `HOST` - Application host

This strict approach ensures:
- No accidental use of default values in production
- Clear documentation of required configuration
- Better security practices
- Easier troubleshooting of configuration issues

## Production Considerations

- **Security**: Use strong passwords for MySQL users
- **Connection Pooling**: Adjust connection pool settings based on your server capacity
- **Backup**: Implement regular database backups
- **SSL**: Enable SSL connections for production databases
- **Environment Variables**: Use proper environment variable management in production
- **JWT Secrets**: Use cryptographically secure random strings for JWT secrets
- **Password Policy**: Implement strong password requirements

## Troubleshooting

### Common Issues:

1. **Connection Refused**: Ensure MySQL service is running
2. **Access Denied**: Check MySQL user credentials and permissions
3. **Database Not Found**: Verify database name in `.env` file
4. **Port Conflicts**: Ensure port 3306 is available
5. **Missing .env**: Run `npm run setup-env` to create environment file

### Debug Mode:

The application includes debug logging for MySQL operations. Check the browser console for connection status and error messages.

## Next Steps

1. **Backend API**: Create a Node.js/Express backend to handle database operations
2. **Authentication**: Implement JWT-based authentication
3. **File Uploads**: Add file upload functionality for books and tutorials
4. **Search**: Implement full-text search capabilities
5. **Caching**: Add Redis caching for improved performance

## Support

For issues related to:
- **MySQL Setup**: Check XAMPP documentation
- **Environment Setup**: Run `npm run setup-env` for interactive configuration
- **Database Schema**: Review the table creation scripts in `src/integrations/mysql/config.ts`
- **Authentication**: Review the MySQL authentication service in `src/integrations/mysql/auth.ts`
- **Security**: Check that `.env` is in your `.gitignore` and contains strong secrets
