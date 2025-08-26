# Books Management System

This document describes the complete CRUD (Create, Read, Update, Delete) operations for books in the Ghana Code Library system.

## Overview

The Books Management System allows administrators to:
- View all books in the library
- Add new books with detailed information
- Edit existing book details
- Delete books from the library
- Search and filter books by various criteria
- Organize books by categories

## Database Schema

### Books Table
```sql
CREATE TABLE `books` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(255) NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `description` TEXT NULL,
  `isbn` VARCHAR(20) NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `cover_image_path` VARCHAR(255) NULL,
  `published_year` SMALLINT NULL,
  `page_count` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_books_category` (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  INDEX `idx_book_title` (`title`)
);
```

### Categories Table
```sql
CREATE TABLE `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_slug` (`slug`)
);
```

## API Endpoints

### Public Endpoints

#### GET /api/books
Retrieves all books with category information.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Advanced React Patterns",
    "author": "Sarah Johnson",
    "description": "Learn advanced React patterns...",
    "cover_image_path": null,
    "file_path": "/books/advanced-react-patterns.pdf",
    "category_id": 1,
    "isbn": "978-1234567890",
    "published_year": 2024,
    "page_count": 350,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "category_name": "Web Development"
  }
]
```

#### GET /api/books/:id
Retrieves a specific book by ID.

#### GET /api/categories
Retrieves all available categories.

### Admin-Only Endpoints

All admin endpoints require the `x-user-email` header with an admin user's email address.

#### POST /api/admin/books
Creates a new book.

**Headers:**
```
x-user-email: admin@example.com
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Book Title",
  "author": "Author Name",
  "description": "Book description",
  "cover_image_path": "/images/cover.jpg",
  "file_path": "/books/book.pdf",
  "category_id": 1,
  "isbn": "978-1234567890",
  "published_year": 2024,
  "page_count": 300
}
```

**Required Fields:**
- `title`
- `author`
- `file_path`
- `category_id`

#### PUT /api/admin/books/:id
Updates an existing book.

**Headers:**
```
x-user-email: admin@example.com
Content-Type: application/json
```

**Body:** Same as POST, but all fields are optional.

#### DELETE /api/admin/books/:id
Deletes a book.

**Headers:**
```
x-user-email: admin@example.com
```

#### POST /api/admin/categories
Creates a new category.

**Headers:**
```
x-user-email: admin@example.com
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Category Name",
  "description": "Category description"
}
```

## Frontend Component

The `BooksManager` component provides a complete interface for managing books:

### Features
- **List/Card View Toggle**: Switch between table and card layouts
- **Search & Filter**: Search by title, author, or ISBN; filter by category
- **Add Book**: Modal form for creating new books
- **Edit Book**: In-place editing of existing books
- **Delete Book**: Confirmation dialog for book deletion
- **Responsive Design**: Works on desktop and mobile devices

### Usage
```tsx
import BooksManager from '@/components/admin/BooksManager';

// In your admin page
const AdminBooksPage = () => {
  return <BooksManager />;
};
```

## Authentication & Authorization

- All admin operations require admin privileges
- User authentication is handled via the `useAuth` hook
- Admin status is verified via the `x-user-email` header
- The server validates admin privileges before allowing operations

## Default Categories

The system automatically creates these default categories if none exist:
- Web Development
- Database
- Cybersecurity
- Programming
- Data Science
- Mobile Development

## Testing

Use the provided test script to verify API functionality:

```bash
node test-books-api.js
```

**Note:** Update the `testUserEmail` variable in the test script with an actual admin email address.

## Error Handling

The system provides comprehensive error handling:
- Validation errors for required fields
- Database constraint violations
- Authentication/authorization failures
- Network and server errors

All errors are displayed to users via toast notifications with appropriate error messages.

## File Management

- **File Paths**: Store the path to book files (PDFs, etc.)
- **Cover Images**: Optional cover image paths for visual appeal
- **File Upload**: Currently supports path-based file references
- **Future Enhancement**: Direct file upload functionality can be added

## Performance Considerations

- Database queries are optimized with proper indexing
- Category information is joined with book queries to reduce API calls
- Search and filtering are performed efficiently
- Pagination can be added for large book collections

## Security Features

- Admin-only access to modification endpoints
- Input validation and sanitization
- SQL injection prevention via parameterized queries
- Role-based access control
- Audit trail via created_at/updated_at timestamps
