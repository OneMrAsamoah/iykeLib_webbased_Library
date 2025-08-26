# Analytics Testing Guide

## Overview
The analytics dashboard has been updated to work with a proper client-server architecture. The client-side code now fetches data from API endpoints instead of trying to connect to MySQL directly.

## Setup Instructions

### 1. Start the Server
```bash
# Make sure you have the environment variables set up
# Copy env.example to .env and fill in your MySQL credentials
cp env.example .env

# Start the server
node server.js
```

The server should start on port 5000 (or the port specified in your .env file).

### 2. Start the Client
```bash
# In a new terminal
npm run dev
```

The client should start on port 5173 (or the next available port).

### 3. Test Admin Access
To access the analytics dashboard, you need to be logged in as an admin user:

1. **Set up an admin user** (if you haven't already):
   ```bash
   # Use the admin setup endpoint
   curl -X POST http://localhost:5000/api/admin/setup \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"yourpassword","displayName":"Admin User"}'
   ```

2. **Set admin role in the browser** (temporary solution):
   ```javascript
   // Open browser console and run:
   setAdminRole('admin@example.com')
   ```

3. **Navigate to the analytics page**:
   - Go to `/admin/analytics` in your browser
   - You should see the analytics dashboard with real data

## API Endpoints

The server now provides these analytics endpoints:

- `GET /api/admin/analytics` - Main analytics data
- `GET /api/admin/analytics/user-growth?months=6` - User growth over time
- `GET /api/admin/analytics/daily-activity?days=7` - Daily activity data

All endpoints require admin authentication via the `x-user-email` header.

## Troubleshooting

### Common Issues

1. **"Cannot read properties of undefined (reading 'prototype')"**
   - This error occurs when mysql2 tries to run in the browser
   - **Solution**: The analytics service now fetches from API endpoints instead

2. **"Access denied. Admin privileges required"**
   - You need to be logged in as an admin user
   - **Solution**: Set up an admin user and use `setAdminRole()` in the browser console

3. **"Failed to fetch analytics data"**
   - Check if the server is running
   - Verify your MySQL connection in the .env file
   - Check server console for database errors

4. **Empty charts or zero values**
   - Your database tables might be empty
   - Add some test data to see the analytics in action

### Database Requirements

Make sure these tables exist and have data:
- `users` - User accounts
- `books` - Book content
- `tutorials` - Video tutorials
- `categories` - Content categories
- `view_logs` - Content view tracking
- `download_logs` - File download tracking
- `ratings` - User ratings

### Testing with Sample Data

If your tables are empty, you can add sample data:

```sql
-- Add a test category
INSERT INTO categories (name, slug, description) VALUES ('Web Development', 'web-dev', 'Web development tutorials and books');

-- Add a test book
INSERT INTO books (title, author, category_id, description, file_path) 
VALUES ('React Basics', 'John Doe', 1, 'Learn React fundamentals', '/books/react-basics.pdf');

-- Add a test tutorial
INSERT INTO tutorials (title, category_id, description, difficulty, content_type, content_url) 
VALUES ('React Tutorial', 1, 'Complete React course', 'Beginner', 'Video', 'https://youtube.com/watch?v=example');
```

## Expected Behavior

When everything is working correctly, you should see:

1. **KPI Cards**: Real numbers for users, views, downloads, etc.
2. **Content Summary**: Counts of books, tutorials, and categories
3. **User Growth Chart**: Line chart showing user growth over 6 months
4. **Top Content**: List of most viewed books/tutorials
5. **Category Performance**: Bar chart of views per category
6. **Daily Activity**: Bar chart of last 7 days activity

## Next Steps

Once the basic analytics are working:

1. **Add real user authentication** instead of the temporary admin role system
2. **Implement proper error handling** for database connection issues
3. **Add more metrics** like user retention, content performance comparisons
4. **Add export functionality** for reports
5. **Implement caching** for better performance
