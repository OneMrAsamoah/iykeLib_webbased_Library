# User Management System

## Overview

The User Management System provides comprehensive functionality for administrators to manage user accounts, roles, and permissions within the iykeLib digital library platform.

## Features

### 🔐 User Management
- **Create Users**: Add new users with customizable roles and profile information
- **Edit Users**: Modify user details including username, email, names, and role
- **Delete Users**: Remove users from the system (with confirmation dialog)
- **User Status**: Activate/deactivate user accounts
- **Role Management**: Assign users to different roles (User, Moderator, Admin)

### 📊 User Analytics
- **User Statistics**: View total users, active users, and role breakdowns
- **Activity Tracking**: Monitor user downloads and content views
- **Last Login**: Track when users last accessed the system
- **Registration Date**: View when users joined the platform

### 🔍 Search & Filtering
- **Search Users**: Find users by username, email, or name
- **Role Filtering**: Filter users by role (User, Moderator, Admin)
- **Status Filtering**: Filter by active/inactive status
- **Real-time Results**: Instant search results with live filtering

### 🎨 User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface using shadcn/ui components
- **Avatar Support**: User profile pictures with fallback initials
- **Status Indicators**: Visual indicators for user status and roles
- **Action Menus**: Contextual actions for each user

## User Roles

### 👤 User
- Basic access to library content
- Can download books and view tutorials
- Limited permissions

### 🛡️ Moderator
- Content moderation capabilities
- Can manage categories and basic content
- Enhanced permissions beyond regular users

### 👑 Admin
- Full system access
- User management capabilities
- System configuration access
- Highest level of permissions

## API Endpoints

### Authentication Required
All endpoints require admin authentication via the `x-user-email` header.

### GET `/api/admin/users`
Retrieve all users with their details and statistics.

**Response:**
```json
{
  "users": [
    {
      "id": "1",
      "username": "admin_user",
      "email": "admin@iykelib.com",
      "first_name": "Admin",
      "last_name": "User",
      "role": "admin",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z",
      "last_login": "2024-12-19T14:30:00Z",
      "profile_image": null,
      "total_downloads": 0,
      "total_views": 0
    }
  ]
}
```

### POST `/api/admin/users`
Create a new user account.

**Request Body:**
```json
{
  "username": "new_user",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "user",
  "password": "secure_password"
}
```

### PUT `/api/admin/users/:id`
Update an existing user's information.

**Request Body:**
```json
{
  "username": "updated_username",
  "email": "newemail@example.com",
  "first_name": "John",
  "last_name": "Smith",
  "role": "moderator"
}
```

### DELETE `/api/admin/users/:id`
Delete a user account and all associated data.

### PATCH `/api/admin/users/:id/status`
Update user account status (active/inactive).

**Request Body:**
```json
{
  "is_active": false
}
```

### GET `/api/admin/users/stats`
Get user statistics and role breakdowns.

**Response:**
```json
{
  "stats": {
    "total_users": 150,
    "active_users": 142,
    "inactive_users": 8,
    "users_by_role": {
      "user": 120,
      "moderator": 25,
      "admin": 5
    }
  }
}
```

### GET `/api/admin/users/search`
Search users with optional filters.

**Query Parameters:**
- `q`: Search query (required)
- `role`: Filter by role (optional)
- `status`: Filter by status (optional)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50) NULL,
  last_name VARCHAR(50) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  profile_image VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_username (username),
  UNIQUE KEY uq_email (email)
);
```

### User Roles Table
```sql
CREATE TABLE user_roles (
  user_id INT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);
```

### Roles Table
```sql
CREATE TABLE roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_name (name)
);
```

## Security Features

### 🔒 Authentication
- Admin-only access to user management
- Email-based authentication verification
- Role-based permission checks

### 🛡️ Data Protection
- Password hashing using bcrypt
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### 📝 Audit Trail
- User creation timestamps
- Last update tracking
- Activity logging capabilities

## Usage Examples

### Creating a New User
1. Navigate to the Users page in the admin panel
2. Click "Add User" button
3. Fill in user details (username, email, password, role)
4. Submit the form
5. User account is created and appears in the users list

### Editing User Role
1. Find the user in the users table
2. Click the actions menu (three dots)
3. Select "Edit User"
4. Change the role to desired level
5. Save changes

### Deactivating a User
1. Find the user in the users table
2. Click the actions menu
3. Select "Deactivate"
4. User status changes to inactive

### Searching Users
1. Use the search bar to find users by name, email, or username
2. Apply role and status filters as needed
3. Results update in real-time

## Error Handling

The system provides comprehensive error handling for:
- Invalid input data
- Database connection issues
- Permission violations
- Duplicate user entries
- Network failures

All errors are displayed to users via toast notifications with clear, actionable messages.

## Performance Considerations

- Efficient database queries with proper indexing
- Pagination support for large user lists
- Optimized search functionality
- Caching of user statistics
- Lazy loading of user data

## Future Enhancements

- **Bulk Operations**: Select multiple users for batch actions
- **User Import/Export**: CSV/Excel file support
- **Advanced Analytics**: User behavior tracking and reporting
- **Email Notifications**: Automated user status updates
- **Two-Factor Authentication**: Enhanced security for admin accounts
- **User Groups**: Organize users into logical groups
- **Permission Granularity**: Fine-grained permission control
- **Audit Logs**: Detailed activity tracking and reporting

## Support

For technical support or feature requests related to the User Management System, please contact the development team or create an issue in the project repository.
