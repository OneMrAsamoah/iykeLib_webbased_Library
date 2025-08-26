# PDF Thumbnail Generation Setup

This document explains how to set up and use the PDF thumbnail generation functionality in the Ghana Code Library.

## Overview

The system now automatically generates thumbnails from the first page of PDF files when books are uploaded or updated. These thumbnails are generated on-demand and cached for better performance.

## Features

- **Automatic Generation**: Thumbnails are automatically created when PDF books are uploaded or updated
- **On-Demand Generation**: Thumbnails can be generated on-the-fly via API endpoint
- **Caching**: Thumbnails are cached for 24 hours to improve performance
- **High Quality**: Uses pdf2pic and sharp for high-quality image generation
- **Responsive**: Thumbnails are resized to 300x400 pixels while maintaining aspect ratio

## Backend Implementation

### Dependencies

The following packages are required for thumbnail generation:

```bash
npm install pdf2pic sharp
```

### API Endpoints

#### Generate Thumbnail
```
GET /api/books/:id/thumbnail
```

Generates a thumbnail from the first page of a PDF book.

**Response:**
- `Content-Type: image/png`
- `Cache-Control: public, max-age=86400` (24 hours)
- PNG image data

**Error Responses:**
- `404`: Book not found or PDF file not found
- `500`: Server error during thumbnail generation

### Automatic Generation

Thumbnails are automatically generated in the following scenarios:

1. **Book Creation**: When a new PDF book is uploaded
2. **Book Update**: When a PDF book file is updated

The system checks if the book type is 'file' and file type is 'application/pdf' before generating thumbnails.

## Frontend Usage

### Thumbnail Component

The existing `Thumbnail` component automatically handles thumbnail generation:

```tsx
import Thumbnail from '@/components/ui/thumbnail';

// With existing thumbnail
<Thumbnail src="/path/to/thumbnail.jpg" alt="Book cover" />

// Auto-generate from book ID
<Thumbnail bookId={123} alt="Book cover" />

// With fallback
<Thumbnail 
  bookId={123} 
  alt="Book cover" 
  fallback="/placeholder.svg" 
/>
```

### How It Works

1. If `src` is provided, the component uses it directly
2. If only `bookId` is provided, the component fetches from `/api/books/:id/thumbnail`
3. If the thumbnail endpoint fails, the component falls back to the `fallback` image
4. Thumbnails are cached in memory during the session to avoid repeated API calls

## Database Considerations

### Current Implementation

The current implementation generates thumbnails on-demand and doesn't store them in the database. This approach:

- **Pros**: Saves database space, always generates fresh thumbnails
- **Cons**: Requires processing time for each request

### Future Enhancement

Consider adding a `thumbnail_content` field to the books table to store generated thumbnails:

```sql
ALTER TABLE books ADD COLUMN thumbnail_content LONGTEXT;
ALTER TABLE books ADD COLUMN thumbnail_generated_at TIMESTAMP;
```

This would allow:
- Faster thumbnail loading
- Reduced server processing
- Better user experience

## Performance Optimization

### Caching Strategy

1. **Browser Cache**: Thumbnails are cached for 24 hours
2. **Memory Cache**: Frontend caches blob URLs during the session
3. **Database Cache**: Future enhancement to store thumbnails in database

### Thumbnail Sizing

- **Dimensions**: 300x400 pixels (maintains aspect ratio)
- **Format**: PNG with 90% quality
- **Resolution**: 150 DPI for good quality

## Troubleshooting

### Common Issues

1. **Thumbnail Not Generating**
   - Check if the book has a PDF file
   - Verify the file_type is 'application/pdf'
   - Check server logs for errors

2. **Poor Image Quality**
   - Increase the density setting in the options
   - Adjust the resize dimensions
   - Check if the source PDF has good quality

3. **Memory Issues**
   - Ensure temporary files are properly cleaned up
   - Monitor server memory usage
   - Consider implementing thumbnail size limits

### Debug Mode

Enable debug logging by checking the server console for:
- Thumbnail generation success/failure messages
- Temporary file cleanup warnings
- PDF processing errors

## Testing

### Test Script

Use the provided test script to verify thumbnail generation:

```bash
node test-thumbnail.js
```

### Manual Testing

1. Upload a PDF book via the admin interface
2. Check if thumbnail is generated automatically
3. Test the thumbnail endpoint directly: `/api/books/:id/thumbnail`
4. Verify the thumbnail displays correctly in the frontend

## Security Considerations

- Thumbnails are publicly accessible (no authentication required)
- File content is validated before processing
- Temporary files are cleaned up after processing
- Input validation prevents path traversal attacks

## Future Enhancements

1. **Batch Processing**: Generate thumbnails for existing books
2. **Multiple Formats**: Support for JPEG, WebP thumbnails
3. **Custom Sizes**: Different thumbnail sizes for different use cases
4. **Background Jobs**: Queue-based thumbnail generation for large files
5. **CDN Integration**: Serve thumbnails from CDN for better performance
