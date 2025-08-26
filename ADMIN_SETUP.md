# Admin Setup Guide

## Temporary Admin Access Setup

Since the backend MySQL integration is not yet implemented, you can temporarily set admin access for testing purposes using the browser console.

### Steps to Set Admin Role:

1. **Sign in to the application** with any email/password
2. **Open browser console** (F12 → Console tab)
3. **Set admin role** by running this command:
   ```javascript
   setAdminRole('your-email@example.com')
   ```
   Replace `your-email@example.com` with the email you used to sign in.

4. **Refresh the page** - you should now have admin access
5. **Navigate to `/admin`** - you should see the admin panel

### Verify Admin Status:

To check your current authentication state, run this in the console:
```javascript
getAuthState()
```

### Remove Admin Role:

To remove admin access, sign out and sign back in, or manually clear the localStorage:
```javascript
localStorage.removeItem('admin_role_your-email@example.com')
```

## Notes:

- This is a temporary solution for development/testing
- Admin role is stored in localStorage and persists across page refreshes
- Once the backend MySQL integration is implemented, this will be replaced with proper server-side role management
- The admin role is tied to the specific email address used during sign-in

## Troubleshooting:

If you're still redirected to the main page after setting admin role:
1. Make sure you're signed in
2. Check that the admin role was set correctly
3. Try refreshing the page
4. Check the console for any error messages
