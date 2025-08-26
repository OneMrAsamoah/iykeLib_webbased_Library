# 🧪 Admin Panel Testing Guide

This guide will help you test the admin panel functionality with real database connectivity.

## 🚀 Quick Start

### 1. **Start Your Server**
Make sure your Node.js server is running on port 5000:
```bash
node server.js
```

### 2. **Start Your Frontend**
In another terminal, start your React app:
```bash
npm run dev
```

### 3. **Set Up Test Admin User**
Run the admin setup script to create a test admin user:
```bash
node setup-admin.cjs
```

This will create:
- **Email**: `admin@test.com`
- **Password**: `admin123`
- **Username**: `admin`
- **Role**: `admin`

## 🔐 **Authentication Setup**

### **Option 1: Use the Auth Helper (Recommended)**
Open your browser console and run:
```javascript
// Set up test admin user
window.authHelper.setupTestAdmin()

// Or set up a regular user
window.authHelper.setupTestUser()

// Check current auth state
window.authHelper.getAuthUser()

// Clear auth if needed
window.authHelper.clearAuth()
```

### **Option 2: Manual localStorage Setup**
```javascript
// Set admin user
localStorage.setItem('user', JSON.stringify({
  id: '1',
  email: 'admin@test.com',
  username: 'admin',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin'
}))

localStorage.setItem('userEmail', 'admin@test.com')
localStorage.setItem('admin_role_admin@test.com', 'admin')
```

## 🧪 **Testing the Admin Panel**

### **1. Users Management**
- Navigate to `/admin/users` in your app
- You should see the database connection status (green dot)
- The system will fetch real users from your database
- Test CRUD operations:
  - **Create**: Add new users with different roles
  - **Read**: View existing users with real-time data
  - **Update**: Edit user information and roles
  - **Delete**: Remove users with confirmation

### **2. Books Management**
- Navigate to `/admin/books`
- Test book creation, editing, and deletion
- Upload files and manage book metadata

### **3. Tutorials Management**
- Navigate to `/admin/tutorials`
- Create and manage tutorial content
- Test category assignments

### **4. Categories Management**
- Navigate to `/admin/categories`
- Manage book and tutorial categories
- Test category creation and editing

## 🔍 **Troubleshooting**

### **Database Connection Issues**
- **Red dot**: Database is not connected
- **Check**: Is your MySQL server running?
- **Check**: Are your `.env` credentials correct?
- **Check**: Is your Node.js server running on port 5000?

### **Authentication Issues**
- **Error**: "User not authenticated"
- **Solution**: Use the auth helper to set up a test user
- **Check**: Is the user email stored in localStorage?

### **API Endpoint Issues**
- **Error**: "Failed to fetch users"
- **Check**: Is your server running on port 5000?
- **Check**: Are the API routes properly configured?

## 📊 **Expected Results**

### **Users Management**
- ✅ Database connection status indicator
- ✅ Real user data from database
- ✅ Working CRUD operations
- ✅ Role-based filtering
- ✅ Search functionality
- ✅ Statistics cards

### **Books Management**
- ✅ File uploads
- ✅ Category management
- ✅ Metadata editing
- ✅ Thumbnail generation

### **Tutorials Management**
- ✅ Content creation
- ✅ Difficulty levels
- ✅ Category assignments
- ✅ File attachments

## 🎯 **Next Steps**

Once testing is complete:
1. **Implement real authentication** (replace test setup)
2. **Add user registration** and login
3. **Implement role-based access control**
4. **Add audit logging** for admin actions
5. **Implement file storage** (S3 or local)

## 🆘 **Need Help?**

If you encounter issues:
1. Check the browser console for error messages
2. Verify your server is running and connected to the database
3. Ensure your `.env` file has the correct database credentials
4. Use the auth helper functions to debug authentication issues

---

**Happy Testing! 🎉**
