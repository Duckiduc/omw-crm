# Admin Panel

The admin panel allows administrators to manage users and system settings in the OMW CRM system.

## Features

### User Management

- **View all users** with pagination and filtering
- **Create new users** with admin or regular user roles
- **Edit existing users** including role changes and password resets
- **Delete users** (with protection against self-deletion)
- **Search and filter** users by name, email, or role

### User Statistics

- Total number of users
- Number of admin users
- Number of regular users
- New users registered this month

## Access Control

### Admin Role

- Only users with `role = 'admin'` can access the admin panel
- Admin users see an additional "Admin Panel" navigation item
- Regular users are redirected away if they try to access admin routes

### Permissions

- Admins can create, edit, and delete other users
- Admins cannot delete their own account
- Admins cannot demote their own admin role
- Password changes are optional when editing users

## Setup

### 1. Run Database Migration

The admin functionality requires adding a `role` column to the users table:

```bash
cd backend
node src/database/run-admin-migration.js
```

### 2. Promote First Admin User

After migration, promote an existing user to admin:

```bash
cd backend
node src/database/promote-admin.js user@example.com
```

### 3. Backend Routes

The admin API endpoints are available at:

- `GET /api/admin/users` - List users with pagination and filtering
- `GET /api/admin/users/:id` - Get single user details
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/users/stats/overview` - Get user statistics

All admin endpoints require:

1. Valid authentication token
2. User role = 'admin'

## Security Features

- **Role-based access control** - Only admins can access admin endpoints
- **JWT token validation** - All requests require valid authentication
- **Input validation** - All user inputs are validated server-side
- **Password hashing** - Passwords are hashed with bcrypt (12 rounds)
- **Self-protection** - Admins cannot delete/demote themselves
- **Email uniqueness** - Prevents duplicate email addresses

## Usage

1. **Login as Admin**: Login with an admin account
2. **Navigate to Admin Panel**: Click "Admin Panel" in the sidebar
3. **View Statistics**: See user counts and monthly signups at the top
4. **Manage Users**: Use the search/filter tools to find users
5. **Create Users**: Click "Add User" to create new accounts
6. **Edit Users**: Click the edit icon to modify user details
7. **Delete Users**: Click the delete icon to remove users (with confirmation)

## API Examples

### Get Users

```javascript
const response = await apiClient.getUsers({
  page: 1,
  limit: 20,
  search: "john",
  role: "user",
});
```

### Create User

```javascript
const newUser = await apiClient.createUser({
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  password: "securepassword",
  role: "user",
});
```

### Update User

```javascript
const updatedUser = await apiClient.updateUser(userId, {
  firstName: "Jane",
  role: "admin",
  // password: "newpassword" // optional
});
```
