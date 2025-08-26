// Simple Express server for MySQL API endpoint
import express from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import mysql from 'mysql2';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { fromPath } from 'pdf2pic';
import sharp from 'sharp';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, createReadStream } from 'fs';
import { join, extname } from 'path';
import { tmpdir } from 'os';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
dotenv.config();

const app = express();
app.use(cors());

// S3 configuration (optional)
const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || '';
const S3_REGION = process.env.S3_REGION || process.env.AWS_REGION || '';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
const S3_SECRET = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';

let s3Client = null;
if (S3_BUCKET && S3_REGION && S3_ACCESS_KEY && S3_SECRET) {
  s3Client = new S3Client({
    region: S3_REGION,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET
    }
  });
}

// Create uploads directory if it doesn't exist
const uploadsDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, DOC, DOCX, TXT, EPUB files and common image types for cover uploads
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/epub+zip',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, EPUB and common image files are allowed.'));
    }
  }
});

// Configure Express to handle large file uploads
app.use(express.json({ 
  limit: '100mb' // Increase limit to 100MB for large PDF files
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '100mb' 
}));

// Add error handling middleware for payload too large errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 413) {
    return res.status(413).json({ 
      error: 'File too large', 
      message: 'The uploaded file exceeds the maximum allowed size of 100MB. Please compress the file or use a smaller version.',
      maxSize: '100MB'
    });
  }
  if (err instanceof SyntaxError && err.message.includes('Unexpected token')) {
    return res.status(400).json({ 
      error: 'Invalid JSON', 
      message: 'The request contains invalid JSON data. Please check your file upload.',
      details: err.message
    });
  }
  // Handle multer errors
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ 
      error: 'File too large', 
      message: 'The uploaded file exceeds the maximum allowed size of 100MB.',
      maxSize: '100MB'
    });
  }
  if (err && err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ 
      error: 'Invalid file type', 
      message: err.message
    });
  }
  next(err);
});

const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || '',
  user: process.env.MYSQL_USER || '',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || '',
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306
});

// Handle database connection
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database successfully');
});

db.on('error', (err) => {
  console.error('MySQL database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection was closed. Reconnecting...');
    db.connect();
  } else {
    throw err;
  }
});

// Authentication Endpoints

// User sign in
app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // Find user by email
  const sql = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.password_hash,
      u.first_name,
      u.last_name,
      u.is_active,
      r.name as role
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.email = ?
  `;
  
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error('Error during sign in:', err);
      return res.status(500).json({ error: 'Database error during sign in' });
    }
    
    if (Array.isArray(results) && results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = results[0];
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated. Please contact an administrator.' });
    }
    
    // Verify password
    try {
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      // Update last login
      db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      
      // Return user data (without password)
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role || 'user',
        is_active: user.is_active
      };
      
      res.json({ 
        user: userData,
        message: 'Sign in successful'
      });
      
    } catch (bcryptError) {
      console.error('Password verification error:', bcryptError);
      return res.status(500).json({ error: 'Error verifying password' });
    }
  });
});

// User sign up
app.post('/api/auth/signup', (req, res) => {
  const { username, email, password, first_name, last_name } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  
  // Check if user already exists
  db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], async (err, rows) => {
    if (err) {
      console.error('Error checking existing user:', err);
      return res.status(500).json({ error: 'Database error during sign up' });
    }
    
    if (Array.isArray(rows) && rows.length > 0) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }
    
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create user
      const insertSql = `
        INSERT INTO users (username, email, password_hash, first_name, last_name, is_active) 
        VALUES (?, ?, ?, ?, ?, 1)
      `;
      
      db.query(insertSql, [username, email, passwordHash, first_name || null, last_name || null], async (err, result) => {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Failed to create user account' });
        }
        
        const userId = result.insertId;
        
        // Assign default user role
        const roleId = await ensureRole('user');
        db.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, roleId],
          (err) => {
            if (err) {
              console.error('Error assigning role:', err);
              // User was created but role assignment failed
              return res.status(201).json({ 
                user: { 
                  id: userId, 
                  username, 
                  email, 
                  first_name, 
                  last_name,
                  role: 'user',
                  is_active: true
                },
                message: 'Account created successfully, but role assignment failed. Please contact an administrator.',
                warning: true
              });
            }
            
            // Return created user
            res.status(201).json({ 
              user: { 
                id: userId, 
                username, 
                email, 
                first_name, 
                last_name,
                role: 'user',
                is_active: true
              },
              message: 'Account created successfully'
            });
          }
        );
      });
      
    } catch (bcryptError) {
      console.error('Password hashing error:', bcryptError);
      return res.status(500).json({ error: 'Error creating account' });
    }
  });
});

// User sign out (optional - can be handled client-side)
app.post('/api/auth/signout', (req, res) => {
  // In a real application, you might invalidate JWT tokens here
  // For now, just return success
  res.json({ message: 'Sign out successful' });
});

// Get current user profile
app.get('/api/auth/profile', (req, res) => {
  const userEmail = req.headers['x-user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  
  const sql = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.first_name,
      u.last_name,
      u.is_active,
      u.created_at,
      u.last_login,
      r.name as role
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.email = ?
  `;
  
  db.query(sql, [userEmail], (err, results) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
    
    if (Array.isArray(results) && results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = results[0];
    
    // Return user data (without sensitive information)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role || 'user',
      is_active: user.is_active,
      created_at: user.created_at,
      last_login: user.last_login
    };
    
    res.json({ user: userData });
  });
});

// Book Management Endpoints

// Get all books with category information
app.get('/api/books', (req, res) => {
  const userEmail = req.headers['x-user-email'];

  const sql = `
    SELECT 
      b.*,
      c.name as category_name,
      COALESCE(dl.download_count, 0) as download_count,
      COALESCE(r_up.up_votes, 0) as up_votes,
      COALESCE(r_down.down_votes, 0) as down_votes,
      ur.vote as user_vote
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as download_count
        FROM download_logs
        WHERE content_type = 'book'
        GROUP BY content_id
    ) dl ON b.id = dl.content_id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as up_votes
        FROM ratings
        WHERE content_type = 'book' AND vote = 1
        GROUP BY content_id
    ) r_up ON b.id = r_up.content_id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as down_votes
        FROM ratings
        WHERE content_type = 'book' AND vote = -1
        GROUP BY content_id
    ) r_down ON b.id = r_down.content_id
    LEFT JOIN ratings ur ON ur.content_id = b.id AND ur.content_type = 'book' AND ur.user_id = (SELECT id FROM users WHERE email = ?)
    ORDER BY b.created_at DESC
  `;
  
  db.query(sql, [userEmail], (err, results) => {
    if (err) {
      console.error('Error fetching books:', err);
      return res.status(500).json({ error: 'Failed to fetch books' });
    }

    const mapped = (results || []).map((r) => {
      const row = Object.assign({}, r);
      row.thumbnail = `/api/books/${row.id}/thumbnail`;
      return row;
    });

    res.json(mapped);
  });
});

// Get book by ID
app.get('/api/books/:id', (req, res) => {
  const bookId = req.params.id;
  const userEmail = req.headers['x-user-email'];
  
  const sql = `
    SELECT 
      b.*,
      c.name as category_name,
      COALESCE(dl.download_count, 0) as download_count,
      COALESCE(r_up.up_votes, 0) as up_votes,
      COALESCE(r_down.down_votes, 0) as down_votes,
      ur.vote as user_vote
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as download_count
        FROM download_logs
        WHERE content_type = 'book'
        GROUP BY content_id
    ) dl ON b.id = dl.content_id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as up_votes
        FROM ratings
        WHERE content_type = 'book' AND vote = 1
        GROUP BY content_id
    ) r_up ON b.id = r_up.content_id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as down_votes
        FROM ratings
        WHERE content_type = 'book' AND vote = -1
        GROUP BY content_id
    ) r_down ON b.id = r_down.content_id
    LEFT JOIN ratings ur ON ur.content_id = b.id AND ur.content_type = 'book' AND ur.user_id = (SELECT id FROM users WHERE email = ?)
    WHERE b.id = ?
  `;
  
  db.query(sql, [userEmail, bookId], (err, results) => {
    if (err) {
      console.error('Error fetching book:', err);
      return res.status(500).json({ error: 'Failed to fetch book' });
    }
    
    if (Array.isArray(results) && results.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const book = results[0];
    book.thumbnail = `/api/books/${book.id}/thumbnail`;
    res.json(book);
  });
});

// Create new book (admin only)
app.post('/api/admin/books', ensureAdmin, (req, res) => {
  const { 
    title, 
    author, 
    description, 
    book_type,
    cover_image_path, 
    cover_image_base64,
    cover_image_type,
    file_path, 
    file_content,
    file_size,
    file_type,
    external_link,
    purchase_link,
    price,
    currency,
    category_id, 
    isbn, 
    published_year, 
    page_count 
  } = req.body;
  
  if (!title || !author || !category_id) {
    return res.status(400).json({ error: 'title, author, and category_id are required' });
  }

  // Validate file size (100MB limit)
  const maxFileSize = 100 * 1024 * 1024; // 100MB in bytes
  if (file_size && parseInt(file_size) > maxFileSize) {
    return res.status(413).json({ 
      error: 'File too large', 
      message: `File size ${Math.round(file_size / (1024 * 1024))}MB exceeds the maximum allowed size of 100MB. Please compress the file or use a smaller version.`,
      maxSize: '100MB',
      currentSize: `${Math.round(file_size / (1024 * 1024))}MB`
    });
  }

  // Validate file content length for base64 data
  if (file_content && file_content.length > maxFileSize * 1.4) { // Base64 is ~1.4x larger than binary
    return res.status(413).json({ 
      error: 'File content too large', 
      message: 'The uploaded file content exceeds the maximum allowed size. Please compress the file or use a smaller version.',
      maxSize: '100MB'
    });
  }

  // Validate book type specific requirements
  if (book_type === 'file' && !file_path) {
    return res.status(400).json({ error: 'file_path is required for file type books' });
  }
  if (book_type === 'link' && !external_link) {
    return res.status(400).json({ error: 'external_link is required for link type books' });
  }
  if (book_type === 'purchase' && !purchase_link) {
    return res.status(400).json({ error: 'purchase_link is required for purchase type books' });
  }
  
  // Check if category exists
  db.query('SELECT id FROM categories WHERE id = ?', [category_id], (err, categoryResults) => {
    if (err) {
      console.error('Error checking category:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(categoryResults) && categoryResults.length === 0) {
      return res.status(400).json({ error: 'Category not found' });
    }
    
    // Insert book
    const sql = `
      INSERT INTO books (
        title, author, description, book_type, cover_image_path, file_path, 
        file_content, file_size, file_type, external_link, purchase_link, price, currency, category_id, isbn, published_year, page_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      title, 
      author, 
      description || null, 
      book_type || 'file',
      cover_image_path || null, 
      file_path || null,
      file_content || null,
      file_size ? parseInt(file_size) : null,
      file_type || null,
      external_link || null,
      purchase_link || null,
      price ? parseFloat(price) : null,
      currency || 'USD',
      category_id, 
      isbn || null, 
      published_year ? parseInt(published_year) : null, 
      page_count ? parseInt(page_count) : null
    ];
    
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error creating book:', err);
        return res.status(500).json({ error: 'Failed to create book' });
      }
      
      // Fetch the created book with category info
      const fetchSql = `
        SELECT 
          b.*,
          c.name as category_name
        FROM books b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.id = ?
      `;
      
      db.query(fetchSql, [result.insertId], (fetchErr, fetchResults) => {
        if (fetchErr) {
          console.error('Error fetching created book:', fetchErr);
          return res.status(500).json({ error: 'Book created but failed to fetch details' });
        }
        
        // If a cover image base64 was provided in the request, store it and update the book record
        try {
          if (req.body && req.body.cover_image_base64) {
            const coverBuffer = Buffer.from(req.body.cover_image_base64, 'base64');
            const ext = req.body.cover_image_type ? req.body.cover_image_type.split('/').pop() : 'png';
            const coverFilename = `cover_${Date.now()}.${ext}`;
            const coverFullPath = join(uploadsDir, coverFilename);
            writeFileSync(coverFullPath, coverBuffer);
            const coverWebPath = `/uploads/${coverFilename}`;
            db.query('UPDATE books SET cover_image_path = ? WHERE id = ?', [coverWebPath, result.insertId], (updateErr) => {
              if (updateErr) console.error('Failed to update cover_image_path for book:', updateErr);
            });
            // Also generate a thumbnail from the uploaded cover and store it in DB
            (async () => {
              try {
                const thumbBuf = await sharp(coverBuffer)
                  .resize(300, 400, { fit: 'inside', withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
                  .png({ quality: 90 })
                  .toBuffer();
                db.query('UPDATE books SET thumbnail_content = ?, thumbnail_mime = ? WHERE id = ?', [thumbBuf, req.body.cover_image_type || 'image/png', result.insertId], (tErr) => {
                  if (tErr) console.error('Failed to store thumbnail in DB for new book:', tErr);
                });
              } catch (thumbErr) {
                console.error('Failed to generate/store thumbnail from uploaded cover:', thumbErr);
              }
            })();
          } else {
            // Legacy behavior removed: PDF thumbnail generation disabled
          }
        } catch (coverStoreErr) {
          console.error('Error storing cover image for book:', coverStoreErr);
        }

        res.status(201).json(fetchResults[0]);
      });
    });
  });
});

// Utility function to safely convert PDF to image with timeout and error handling
async function safePdfToImage(pdfPath, options, timeoutMs = 30000) {
  return new Promise(async (resolve, reject) => {
    let timeoutId;
    let conversionProcess;
    
    try {
      // Set up timeout
      timeoutId = setTimeout(() => {
        reject(new Error('PDF conversion timeout'));
      }, timeoutMs);
      
      // Start conversion
      const convert = fromPath(pdfPath, options);
      conversionProcess = convert(1);
      
      const pageData = await conversionProcess;
      
      // Clear timeout on success
      clearTimeout(timeoutId);
      
      if (!pageData || !pageData.path) {
        reject(new Error('Failed to convert PDF page'));
        return;
      }
      
      resolve(pageData);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// Helper function to generate thumbnail for a book
async function generateBookThumbnail(bookId) {
  let tempPdfPath = null;
  let tempImagePath = null;
  
  try {
    // Get book file information
    const bookResult = await new Promise((resolve, reject) => {
      db.query('SELECT file_path, file_content, file_type, title FROM books WHERE id = ?', [bookId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    if (!Array.isArray(bookResult) || bookResult.length === 0) {
      console.log(`Book ${bookId} not found for thumbnail generation`);
      return;
    }
    
    const book = bookResult[0];
    
    if (!book.file_content || book.file_type !== 'application/pdf') {
      console.log(`Book ${bookId} is not a PDF, skipping thumbnail generation`);
      return;
    }
    
    // Check file size to prevent memory issues
    const pdfBuffer = Buffer.from(book.file_content, 'base64');
    const fileSizeMB = pdfBuffer.length / (1024 * 1024);
    
    if (fileSizeMB > 50) { // Skip very large PDFs (>50MB)
      console.log(`Book ${bookId} PDF too large (${fileSizeMB.toFixed(2)}MB), skipping thumbnail generation`);
      return;
    }
    
    // Convert base64 to buffer and save to temporary file
    tempPdfPath = join(tmpdir(), `book_${bookId}_${Date.now()}.pdf`);
    
    try {
      // Write PDF to temporary file
      writeFileSync(tempPdfPath, pdfBuffer);
      
      // Configure pdf2pic options with better error handling
      const options = {
        density: 150,
        saveFilename: `thumb_${bookId}_${Date.now()}`,
        savePath: tmpdir(),
        format: "png",
        width: 300,
        height: 400
      };
      
      // Convert PDF to image with timeout and better error handling
      const pageData = await safePdfToImage(tempPdfPath, options, 30000);
      
      if (!pageData || !pageData.path) {
        console.log(`Failed to convert PDF page for book ${bookId}`);
        return;
      }
      
      tempImagePath = pageData.path;
      
      // Process the image with sharp
      const thumbnailBuffer = await sharp(tempImagePath)
        .resize(300, 400, { fit: 'inside', withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png({ quality: 90 })
        .toBuffer()
        .catch(error => {
          console.error(`Sharp processing error for book ${bookId}:`, error);
          throw new Error('Failed to process image with Sharp');
        });
      
      // Convert to base64 for storage (optional - you could store this in the database)
      const thumbnailBase64 = thumbnailBuffer.toString('base64');
      
      // Update the book with thumbnail data (you might want to add a thumbnail_content field to your database)
      // For now, we'll just log success
      console.log(`Successfully generated thumbnail for book ${bookId}`);
      
    } catch (conversionError) {
      console.error(`PDF conversion error for book ${bookId}:`, conversionError);
      // Don't re-throw, just log and continue
    }
    
  } catch (error) {
    console.error(`Error generating thumbnail for book ${bookId}:`, error);
  } finally {
    // Clean up temporary files with better error handling
    try {
      if (tempPdfPath && require('fs').existsSync(tempPdfPath)) {
        unlinkSync(tempPdfPath);
      }
      if (tempImagePath && require('fs').existsSync(tempImagePath)) {
        unlinkSync(tempImagePath);
      }
      
      // Clean up any pdf2pic output files that might have been created
      const pdf2picOutputs = require('fs').readdirSync(tmpdir())
        .filter(file => file.startsWith('untitled.') || file.startsWith(`thumb_${bookId}_`))
        .map(file => join(tmpdir(), file));
      
      pdf2picOutputs.forEach(file => {
        try {
          if (require('fs').existsSync(file)) {
            unlinkSync(file);
          }
        } catch (cleanupError) {
          console.warn(`Warning: Failed to clean up temporary file ${file}:`, cleanupError);
        }
      });
    } catch (cleanupError) {
      console.warn('Warning: Failed to clean up temporary files:', cleanupError);
    }
  }
}

// Update book (admin only)
app.put('/api/admin/books/:id', ensureAdmin, (req, res) => {
  const bookId = req.params.id;
  const { 
    title, 
    author, 
    description, 
    book_type,
    cover_image_path, 
    file_path, 
    file_content,
    file_size,
    file_type,
    external_link,
    purchase_link,
    price,
    currency,
    category_id, 
    isbn, 
    published_year, 
    page_count 
  } = req.body;
  
  if (!bookId) {
    return res.status(400).json({ error: 'Book ID is required' });
  }
  
  // Validate file size (100MB limit) if updating file
  const maxFileSize = 100 * 1024 * 1024; // 100MB in bytes
  if (file_size && parseInt(file_size) > maxFileSize) {
    return res.status(413).json({ 
      error: 'File too large', 
      message: `File size ${Math.round(file_size / (1024 * 1024))}MB exceeds the maximum allowed size of 100MB. Please compress the file or use a smaller version.`,
      maxSize: '100MB',
      currentSize: `${Math.round(file_size / (1024 * 1024))}MB`
    });
  }

  // Validate file content length for base64 data if updating file
  if (file_content && file_content.length > maxFileSize * 1.4) { // Base64 is ~1.4x larger than binary
    return res.status(413).json({ 
      error: 'File content too large', 
      message: 'The uploaded file content exceeds the maximum allowed size. Please compress the file or use a smaller version.',
      maxSize: '100MB'
    });
  }
  
  // Check if book exists
  db.query('SELECT id FROM books WHERE id = ?', [bookId], (err, bookResults) => {
    if (err) {
      console.error('Error checking book existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(bookResults) && bookResults.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // Check if category exists if provided
    if (category_id) {
      db.query('SELECT id FROM categories WHERE id = ?', [category_id], (err, categoryResults) => {
        if (err) {
          console.error('Error checking category:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (Array.isArray(categoryResults) && categoryResults.length === 0) {
          return res.status(400).json({ error: 'Category not found' });
        }
        
        updateBook();
      });
    } else {
      updateBook();
    }
    
    function updateBook() {
      const updateFields = [];
      const updateValues = [];
      
      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }
      if (author !== undefined) {
        updateFields.push('author = ?');
        updateValues.push(author);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (book_type !== undefined) {
        updateFields.push('book_type = ?');
        updateValues.push(book_type);
      }
      if (cover_image_path !== undefined) {
        updateFields.push('cover_image_path = ?');
        updateValues.push(cover_image_path);
      }
      if (file_path !== undefined) {
        updateFields.push('file_path = ?');
        updateValues.push(file_path);
      }
      if (file_content !== undefined) {
        updateFields.push('file_content = ?');
        updateValues.push(file_content);
      }
      if (file_size !== undefined) {
        updateFields.push('file_size = ?');
        updateValues.push(file_size ? parseInt(file_size) : null);
      }
      if (file_type !== undefined) {
        updateFields.push('file_type = ?');
        updateValues.push(file_type);
      }
      if (external_link !== undefined) {
        updateFields.push('external_link = ?');
        updateValues.push(external_link);
      }
      if (purchase_link !== undefined) {
        updateFields.push('purchase_link = ?');
        updateValues.push(purchase_link);
      }
      if (price !== undefined) {
        updateFields.push('price = ?');
        updateValues.push(price ? parseFloat(price) : null);
      }
      if (currency !== undefined) {
        updateFields.push('currency = ?');
        updateValues.push(currency);
      }
      if (category_id !== undefined) {
        updateFields.push('category_id = ?');
        updateValues.push(category_id);
      }
      if (isbn !== undefined) {
        updateFields.push('isbn = ?');
        updateValues.push(isbn);
      }
      if (published_year !== undefined) {
        updateFields.push('published_year = ?');
        updateValues.push(published_year ? parseInt(published_year) : null);
      }
      if (page_count !== undefined) {
        updateFields.push('page_count = ?');
        updateValues.push(page_count ? parseInt(page_count) : null);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(bookId);
      
      const sql = `UPDATE books SET ${updateFields.join(', ')} WHERE id = ?`;
      
      db.query(sql, updateValues, (err) => {
        if (err) {
          console.error('Error updating book:', err);
          return res.status(500).json({ error: 'Failed to update book' });
        }
        
        // Fetch the updated book with category info
        const fetchSql = `
          SELECT 
            b.*,
            c.name as category_name
          FROM books b
          LEFT JOIN categories c ON b.category_id = c.id
          WHERE b.id = ?
        `;
        
        db.query(fetchSql, [bookId], (fetchErr, fetchResults) => {
          if (fetchErr) {
            console.error('Error fetching updated book:', fetchErr);
            return res.status(500).json({ error: 'Book updated but failed to fetch details' });
          }
          
          // If a cover image base64 was provided in the update request, store it and generate a thumbnail
          try {
            if (req.body && req.body.cover_image_base64) {
              const coverBuffer = Buffer.from(req.body.cover_image_base64, 'base64');
              const ext = req.body.cover_image_type ? req.body.cover_image_type.split('/').pop() : 'png';
              const coverFilename = `cover_${Date.now()}.${ext}`;
              const coverFullPath = join(uploadsDir, coverFilename);
              writeFileSync(coverFullPath, coverBuffer);
              const coverWebPath = `/uploads/${coverFilename}`;

              // Update cover_image_path on the record
              db.query('UPDATE books SET cover_image_path = ? WHERE id = ?', [coverWebPath, bookId], (updateErr) => {
                if (updateErr) console.error('Failed to update cover_image_path for book (PUT):', updateErr);
              });

              // Generate and store thumbnail buffer asynchronously
              (async () => {
                try {
                  const thumbBuf = await sharp(coverBuffer)
                    .resize(300, 400, { fit: 'inside', withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
                    .png({ quality: 90 })
                    .toBuffer();

                  db.query('UPDATE books SET thumbnail_content = ?, thumbnail_mime = ? WHERE id = ?', [thumbBuf, req.body.cover_image_type || 'image/png', bookId], (tErr) => {
                    if (tErr) console.error('Failed to store thumbnail in DB for updated book (PUT):', tErr);
                  });
                } catch (thumbErr) {
                  console.error('Failed to generate/store thumbnail from uploaded cover (PUT):', thumbErr);
                }
              })();

              // Reflect the new cover path in the response object
              fetchResults[0].cover_image_path = coverWebPath;
            }
          } catch (coverStoreErr) {
            console.error('Error storing cover image for book (PUT):', coverStoreErr);
          }

          res.json(fetchResults[0]);
        });
      });
    }
  });
});

// Delete book (admin only)
app.delete('/api/admin/books/:id', ensureAdmin, (req, res) => {
  const bookId = req.params.id;
  
  if (!bookId) {
    return res.status(400).json({ error: 'Book ID is required' });
  }
  
  // Check if book exists
  db.query('SELECT id FROM books WHERE id = ?', [bookId], (err, bookResults) => {
    if (err) {
      console.error('Error checking book existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(bookResults) && bookResults.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // Delete book
    db.query('DELETE FROM books WHERE id = ?', [bookId], (err) => {
      if (err) {
        console.error('Error deleting book:', err);
        return res.status(500).json({ error: 'Failed to delete book' });
      }
      
      res.json({ message: 'Book deleted successfully' });
    });
  });
});

// Download book file (supports local uploads and S3)
app.get('/api/books/:id/download', async (req, res) => {
  const bookId = req.params.id;
  if (!bookId) return res.status(400).json({ error: 'Book ID is required' });

  // Log the download event
  const userEmail = req.headers['x-user-email'];
  if (userEmail) {
    try {
      const userId = await getUserIdByEmail(userEmail);
      if (userId) {
        db.query(
          'INSERT INTO download_logs (user_id, content_id, content_type, ip_address) VALUES (?, ?, ?, ?)',
          [userId, bookId, 'book', req.ip]
        );
      }
    } catch (logError) {
      console.error('Failed to log download:', logError);
    }
  }

  db.query('SELECT file_path, file_content, file_type, file_size, title FROM books WHERE id = ?', [bookId], async (err, results) => {
    if (err) {
      console.error('Error fetching book file:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = results[0];

    // If file stored in S3 (s3://bucket/key), return presigned URL
    if (book.file_path && String(book.file_path).startsWith('s3://')) {
      if (!s3Client) return res.status(500).json({ error: 'S3 not configured on server' });
      try {
        const [, bucketAndKey] = book.file_path.split('s3://');
        const firstSlash = bucketAndKey.indexOf('/');
        const bucket = bucketAndKey.substring(0, firstSlash);
        const key = bucketAndKey.substring(firstSlash + 1);
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return res.json({ url });
      } catch (s3err) {
        console.error('S3 presign error:', s3err);
        return res.status(500).json({ error: 'Failed to generate download URL' });
      }
    }

    // If file stored on disk via local uploads
    if (book.file_path && String(book.file_path).startsWith('/uploads/')) {
      const diskPath = join(process.cwd(), book.file_path.replace(/^\//, ''));
      if (!existsSync(diskPath)) return res.status(404).json({ error: 'File not found on disk' });
      const filename = book.title ? `${book.title}${extname(diskPath) || ''}` : diskPath.split('/').pop();
      return res.download(diskPath, filename, (downloadErr) => {
        if (downloadErr) console.error('Download error:', downloadErr);
      });
    }

    // If file content stored in DB as base64
    if (book.file_content) {
      const buffer = Buffer.from(book.file_content, 'base64');
      res.setHeader('Content-Type', book.file_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${(book.file_path || book.title || 'download')}"`);
      res.setHeader('Content-Length', book.file_size || buffer.length);
      return res.send(buffer);
    }

    return res.status(404).json({ error: 'File content not found' });
  });
});

// Update book thumbnail (admin only)
app.patch('/api/books/:id', ensureAdmin, async (req, res) => {
  const bookId = req.params.id;
  const { cover_image_path, cover_image_base64, cover_image_type } = req.body;

  if (!bookId) {
    return res.status(400).json({ error: 'Book ID is required' });
  }

  // If a base64 cover image is provided, store it to uploads and also generate + store thumbnail blob in DB
  if (cover_image_base64) {
    try {
      const coverBuffer = Buffer.from(cover_image_base64, 'base64');
      const ext = cover_image_type ? cover_image_type.split('/').pop() : 'png';
      const coverFilename = `cover_${Date.now()}.${ext}`;
      const coverFullPath = join(uploadsDir, coverFilename);
      writeFileSync(coverFullPath, coverBuffer);
      const coverWebPath = `/uploads/${coverFilename}`;

      // Update cover_image_path first
      db.query('UPDATE books SET cover_image_path = ? WHERE id = ?', [coverWebPath, bookId], (err, result) => {
        if (err) console.error('Failed to update cover_image_path for book (PATCH):', err);
      });

      // Generate thumbnail buffer (async, but we'll attempt immediately)
      try {
        const thumbBuf = await sharp(coverBuffer)
          .resize(300, 400, { fit: 'inside', withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png({ quality: 90 })
          .toBuffer();

        db.query('UPDATE books SET thumbnail_content = ?, thumbnail_mime = ? WHERE id = ?', [thumbBuf, cover_image_type || 'image/png', bookId], (tErr) => {
          if (tErr) console.error('Failed to store thumbnail in DB (PATCH):', tErr);
        });
      } catch (thumbErr) {
        console.error('Failed to generate/store thumbnail from uploaded cover (PATCH):', thumbErr);
      }

      return res.json({ message: 'Cover image and thumbnail updated', cover_image_path: coverWebPath });
    } catch (e) {
      console.error('Error processing cover_image_base64 in PATCH:', e);
      return res.status(500).json({ error: 'Failed to process cover image' });
    }
  }

  // Otherwise, require cover_image_path to update
  if (!cover_image_path) {
    return res.status(400).json({ error: 'Cover image path is required' });
  }

  db.query('UPDATE books SET cover_image_path = ? WHERE id = ?', [cover_image_path, bookId], (err, result) => {
    if (err) {
      console.error('Error updating book thumbnail:', err);
      return res.status(500).json({ error: 'Failed to update book thumbnail' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ message: 'Book thumbnail updated successfully', cover_image_path });
  });
});

// Scrape cover images from URLs (Amazon, Goodreads, etc.)
app.get('/api/scrape-cover', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    let coverUrl = null;
    
    // Handle Amazon URLs
    if (url.includes('amazon.com') || url.includes('amazon.co.uk') || url.includes('amazon.ca')) {
      // Extract ASIN from Amazon URL
      const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
      if (asinMatch) {
        const asin = asinMatch[1];
        // Use Amazon's image URL format
        coverUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.L.jpg`;
      }
    }
    
    // Handle Goodreads URLs
    else if (url.includes('goodreads.com')) {
      // For Goodreads, we'd need to scrape the page
      // This is a simplified approach - in production you might want to use a proper scraping service
      coverUrl = null; // Would need proper implementation
    }
    
    // Handle other book retailer URLs
    else if (url.includes('bookdepository.com') || url.includes('waterstones.com')) {
      // These would need custom scraping logic
      coverUrl = null;
    }
    
    if (coverUrl) {
      res.json({ coverUrl });
    } else {
      res.status(404).json({ error: 'Could not extract cover from this URL' });
    }
    
  } catch (error) {
    console.error('Error scraping cover:', error);
    res.status(500).json({ error: 'Failed to scrape cover image' });
  }
});

// Test endpoint for debugging
app.get('/api/test-thumbnail', (req, res) => {
  res.json({ 
    message: 'Thumbnail endpoint is working',
    uploadsDir: uploadsDir,
    currentDir: process.cwd(),
    exists: existsSync(uploadsDir)
  });
});

// Generate thumbnail from various file types
app.post('/api/generate-thumbnail', async (req, res) => {
  const { filePath, type } = req.body;
  
  console.log('Thumbnail generation request:', { filePath, type });
  
  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }
  
  try {
    let thumbnailPath = null;
    
    if (type === 'pdf' || filePath.toLowerCase().endsWith('.pdf')) {
      // Generate PDF thumbnail
      const diskPath = filePath.startsWith('/uploads/') 
        ? join(process.cwd(), filePath.replace(/^\//, ''))
        : filePath;
      
      console.log('PDF processing:', { 
        originalPath: filePath, 
        diskPath, 
        exists: existsSync(diskPath),
        cwd: process.cwd()
      });
      
      if (!existsSync(diskPath)) {
        return res.status(404).json({ error: 'PDF file not found' });
      }
      
      // Check file size
      const stats = require('fs').statSync(diskPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      if (fileSizeMB > 50) {
        return res.status(413).json({ error: 'PDF file too large for thumbnail generation' });
      }
      
      // Generate thumbnail
      const options = {
        density: 150,
        saveFilename: `thumb_${Date.now()}`,
        savePath: tmpdir(),
        format: 'png',
        width: 300,
        height: 400
      };
      
      try {
        const pageData = await safePdfToImage(diskPath, options, 30000);
        
        if (!pageData || !pageData.path) {
          throw new Error('Failed to convert PDF page');
        }
        
        // Process with Sharp
        const thumbnailBuffer = await sharp(pageData.path)
          .resize(300, 400, { fit: 'inside', withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png({ quality: 90 })
          .toBuffer();
        
        // Save thumbnail to uploads directory
        const thumbnailFilename = `thumbnail_${Date.now()}.png`;
        const thumbnailFullPath = join(uploadsDir, thumbnailFilename);
        require('fs').writeFileSync(thumbnailFullPath, thumbnailBuffer);
        
        // Return the web-accessible path
        thumbnailPath = `/uploads/${thumbnailFilename}`;
        
        // Clean up temporary files
        try {
          if (existsSync(pageData.path)) {
            unlinkSync(pageData.path);
          }
        } catch (cleanupError) {
          console.warn('Warning: Failed to clean up temporary file:', cleanupError);
        }
        
      } catch (pdfError) {
        console.error('PDF conversion error:', pdfError);
        throw new Error(`PDF conversion failed: ${pdfError.message}`);
      }
      
    } else if (type && type.startsWith('image/')) {
      // Generate thumbnail from image
      const diskPath = filePath.startsWith('/uploads/') 
        ? join(process.cwd(), filePath.replace(/^\//, ''))
        : filePath;
      
      if (!existsSync(diskPath)) {
        return res.status(404).json({ error: 'Image file not found' });
      }
      
      try {
        // Process with Sharp
        const thumbnailBuffer = await sharp(diskPath)
          .resize(300, 400, { fit: 'inside', withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png({ quality: 90 })
          .toBuffer();
        
        // Save thumbnail
        const thumbnailFilename = `thumbnail_${Date.now()}.png`;
        const thumbnailFullPath = join(uploadsDir, thumbnailFilename);
        require('fs').writeFileSync(thumbnailFullPath, thumbnailBuffer);
        
        // Return the web-accessible path
        thumbnailPath = `/uploads/${thumbnailFilename}`;
        
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        throw new Error(`Image processing failed: ${imageError.message}`);
      }
    }
    
    if (thumbnailPath) {
      res.json({ thumbnailPath });
    } else {
      res.status(400).json({ error: 'Unsupported file type for thumbnail generation' });
    }
    
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).json({ 
      error: 'Failed to generate thumbnail',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Generate thumbnail from PDF first page or serve existing cover image
app.get('/api/books/:id/thumbnail', async (req, res) => {
  const bookId = req.params.id;

  if (!bookId) {
    return res.status(400).json({ error: 'Book ID is required' });
  }

  try {
    // Get book file information
    const bookResult = await new Promise((resolve, reject) => {
      // Ensure we select thumbnail_content and thumbnail_mime so we can serve stored blobs
      db.query('SELECT file_path, file_content, file_type, cover_image_path, title, thumbnail_content, thumbnail_mime FROM books WHERE id = ?', [bookId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!Array.isArray(bookResult) || bookResult.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = bookResult[0];

    // If a cover image path already exists, serve it directly (local uploads or absolute URL)
    if (book.cover_image_path) {
      const cover = String(book.cover_image_path);
      if (cover.startsWith('/')) {
        const imgPath = join(process.cwd(), cover.replace(/^\//, ''));
        if (existsSync(imgPath)) {
          return res.sendFile(imgPath);
        }
      } else if (cover.startsWith('http')) {
        return res.redirect(cover);
      }
    }

    // If thumbnail blob exists in DB, serve it with caching headers
    if (book.thumbnail_content) {
      try {
        const buffer = Buffer.from(book.thumbnail_content, 'binary');
        const mime = book.thumbnail_mime || 'image/png';
        res.setHeader('Content-Type', mime);
        // Cache for 1 day and set ETag for conditional requests
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const etag = require('crypto').createHash('md5').update(buffer).digest('hex');
        res.setHeader('ETag', etag);

        // If client sent matching ETag, return 304
        if (req.headers['if-none-match'] === etag) {
          return res.status(304).end();
        }

        res.setHeader('Content-Length', buffer.length);
        return res.send(buffer);
      } catch (serveErr) {
        console.error('Error serving thumbnail blob from DB:', serveErr);
        // fall through to other generation strategies
      }
    }

    // If file is stored on disk (local upload) and is a PDF, generate thumbnail from disk
    if (book.file_path && String(book.file_path).startsWith('/uploads/') && book.file_type === 'application/pdf') {
      const diskPath = join(process.cwd(), book.file_path.replace(/^\//, ''));
      if (!existsSync(diskPath)) return res.status(404).json({ error: 'PDF file not found on disk' });

      // Check file size to prevent memory issues
      const stats = require('fs').statSync(diskPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      if (fileSizeMB > 50) { // Skip very large PDFs (>50MB)
        return res.status(413).json({ error: 'PDF file too large for thumbnail generation' });
      }

      // Convert from disk path
      const tempImagePath = join(tmpdir(), `book_${bookId}_${Date.now()}.png`);
      try {
        const options = {
          density: 150,
          saveFilename: `thumb_${bookId}_${Date.now()}`,
          savePath: tmpdir(),
          format: 'png',
          width: 300,
          height: 400
        };

        const convert = fromPath(diskPath, options);
        
        // Add timeout to prevent hanging processes
        const pageData = await safePdfToImage(diskPath, options, 30000);
        
        if (!pageData || !pageData.path) throw new Error('Failed to convert PDF page');

        const thumbnailBuffer = await sharp(pageData.path)
          .resize(300, 400, { fit: 'inside', withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png({ quality: 90 })
          .toBuffer();

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Content-Length', thumbnailBuffer.length);
        return res.send(thumbnailBuffer);
      } catch (conversionError) {
        console.error(`PDF conversion error for book ${bookId}:`, conversionError);
        return res.status(500).json({ error: 'Failed to convert PDF to thumbnail' });
      } finally {
        try {
          // Clean up any pdf2pic output files
          const pdf2picOutputs = require('fs').readdirSync(tmpdir())
            .filter(file => file.startsWith('untitled.') || file.startsWith(`thumb_${bookId}_`))
            .map(file => join(tmpdir(), file));
          
          pdf2picOutputs.forEach(file => {
            try {
              if (require('fs').existsSync(file)) {
                unlinkSync(file);
              }
            } catch (cleanupError) {
              console.warn(`Warning: Failed to clean up temporary file ${file}:`, cleanupError);
            }
          });
          
          if (tempImagePath && existsSync(tempImagePath)) {
            unlinkSync(tempImagePath);
          }
        } catch (cleanupError) {
          console.warn('Warning: Failed to clean up temporary files:', cleanupError);
        }
      }
    }

    // Fallback: if file content stored in DB as base64 (PDF), generate thumbnail from buffer
    if (book.file_content && book.file_type === 'application/pdf') {
      const pdfBuffer = Buffer.from(book.file_content, 'base64');
      
      // Check file size to prevent memory issues
      const fileSizeMB = pdfBuffer.length / (1024 * 1024);
      
      if (fileSizeMB > 50) { // Skip very large PDFs (>50MB)
        return res.status(413).json({ error: 'PDF file too large for thumbnail generation' });
      }
      
      const tempPdfPath = join(tmpdir(), `book_${bookId}_${Date.now()}.pdf`);
      const tempImagePath = join(tmpdir(), `book_${bookId}_${Date.now()}.png`);

      try {
        writeFileSync(tempPdfPath, pdfBuffer);

        const options = {
          density: 150,
          saveFilename: `thumb_${bookId}_${Date.now()}`,
          savePath: tmpdir(),
          format: 'png',
          width: 300,
          height: 400
        };

        const convert = fromPath(tempPdfPath, options);
        
        // Add timeout to prevent hanging processes
        const pageData = await safePdfToImage(tempPdfPath, options, 30000);
        
        if (!pageData || !pageData.path) {
          console.log(`Failed to convert PDF page for book ${bookId}`);
          return;
        }
        
        tempImagePath = pageData.path;
        
        const thumbnailBuffer = await sharp(tempImagePath)
          .resize(300, 400, { fit: 'inside', withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png({ quality: 90 })
          .toBuffer()
          .catch(error => {
            console.error(`Sharp processing error for book ${bookId}:`, error);
            throw new Error('Failed to process image with Sharp');
          });

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Content-Length', thumbnailBuffer.length);
        return res.send(thumbnailBuffer);
      } catch (conversionError) {
        console.error(`PDF conversion error for book ${bookId}:`, conversionError);
        return res.status(500).json({ error: 'Failed to convert PDF to thumbnail' });
      } finally {
        try {
          if (existsSync(tempPdfPath)) unlinkSync(tempPdfPath);
          
          // Clean up any pdf2pic output files
          const pdf2picOutputs = require('fs').readdirSync(tmpdir())
            .filter(file => file.startsWith('untitled.') || file.startsWith(`thumb_${bookId}_`))
            .map(file => join(tmpdir(), file));
          
          pdf2picOutputs.forEach(file => {
            try {
              if (require('fs').existsSync(file)) {
                unlinkSync(file);
              }
            } catch (cleanupError) {
              console.warn(`Warning: Failed to clean up temporary file ${file}:`, cleanupError);
            }
          });
          
          if (existsSync(tempImagePath)) unlinkSync(tempImagePath);
        } catch (cleanupError) {
          console.warn('Warning: Failed to clean up temporary files:', cleanupError);
        }
      }
    }

    return res.status(404).json({ error: 'PDF file not found' });
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).json({ error: 'Failed to generate thumbnail' });
  }
});

// Get categories for books
app.get('/api/categories', (req, res) => {
  const sql = `
    SELECT 
      c.id, 
      c.name, 
      c.description, 
      c.slug,
      COALESCE(b.book_count, 0) as bookCount,
      COALESCE(t.tutorial_count, 0) as tutorialCount,
      COALESCE(dl.total_downloads, 0) as totalDownloads
    FROM categories c
    LEFT JOIN (
      SELECT category_id, COUNT(*) as book_count 
      FROM books 
      GROUP BY category_id
    ) b ON c.id = b.category_id
    LEFT JOIN (
      SELECT category_id, COUNT(*) as tutorial_count 
      FROM tutorials 
      GROUP BY category_id
    ) t ON c.id = t.category_id
    LEFT JOIN (
      SELECT b.category_id, SUM(dl.download_count) as total_downloads
      FROM books b
      LEFT JOIN (
        SELECT content_id, COUNT(*) as download_count
        FROM download_logs
        WHERE content_type = 'book'
        GROUP BY content_id
      ) dl ON b.id = dl.content_id
      GROUP BY b.category_id
    ) dl ON c.id = dl.category_id
    ORDER BY c.name
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching categories:', err);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
    res.json(results);
  });
});

// Public: Get all tutorials (no auth required)
app.get('/api/tutorials', (req, res) => {
  const userEmail = req.headers['x-user-email'];
  const sql = `
    SELECT
      t.*,
      c.name as category_name,
      COALESCE(vl.view_count, 0) as view_count,
      COALESCE(r_up.up_votes, 0) as up_votes,
      COALESCE(r_down.down_votes, 0) as down_votes,
      ur.vote as user_vote
    FROM tutorials t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as view_count
        FROM view_logs
        WHERE content_type = 'tutorial'
        GROUP BY content_id
    ) vl ON t.id = vl.content_id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as up_votes
        FROM ratings
        WHERE content_type = 'tutorial' AND vote = 1
        GROUP BY content_id
    ) r_up ON t.id = r_up.content_id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as down_votes
        FROM ratings
        WHERE content_type = 'tutorial' AND vote = -1
        GROUP BY content_id
    ) r_down ON t.id = r_down.content_id
    LEFT JOIN ratings ur ON ur.content_id = t.id AND ur.content_type = 'tutorial' AND ur.user_id = (SELECT id FROM users WHERE email = ?)
    ORDER BY t.created_at DESC
  `;
  db.query(sql, [userEmail], (err, results) => {
    if (err) {
      console.error('Error fetching tutorials (public):', err);
      return res.status(500).json({ error: 'Failed to fetch tutorials' });
    }
    res.json(results);
  });
});

// Get all tutorials (admin only)
app.get('/api/admin/tutorials', ensureAdmin, (req, res) => {
  const sql = `
    SELECT
      t.*,
      c.name as category_name,
      COALESCE(vl.view_count, 0) as view_count,
      COALESCE(r_up.up_votes, 0) as up_votes,
      COALESCE(r_down.down_votes, 0) as down_votes
    FROM tutorials t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN (
      SELECT content_id, COUNT(*) as view_count
      FROM view_logs
      WHERE content_type = 'tutorial'
      GROUP BY content_id
    ) vl ON t.id = vl.content_id
    LEFT JOIN (
      SELECT content_id, COUNT(*) as up_votes
      FROM ratings
      WHERE content_type = 'tutorial' AND vote = 1
      GROUP BY content_id
    ) r_up ON t.id = r_up.content_id
    LEFT JOIN (
      SELECT content_id, COUNT(*) as down_votes
      FROM ratings
      WHERE content_type = 'tutorial' AND vote = -1
      GROUP BY content_id
    ) r_down ON t.id = r_down.content_id
    ORDER BY t.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching tutorials:', err);
      return res.status(500).json({ error: 'Failed to fetch tutorials' });
    }
    res.json(results);
  });
});

// Create category (admin only)
app.post('/api/admin/categories', ensureAdmin, (req, res) => {
  const { name, description, slug } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  // Check if category already exists
  db.query('SELECT id FROM categories WHERE name = ? OR slug = ?', [name, slug], (err, results) => {
    if (err) {
      console.error('Error checking category existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(results) && results.length > 0) {
      return res.status(409).json({ error: 'Category with this name or slug already exists' });
    }
    
    // Create slug from name if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    // Insert category
    const sql = 'INSERT INTO categories (name, description, slug) VALUES (?, ?, ?)';
    
    db.query(sql, [name, description || null, finalSlug], (err, result) => {
      if (err) {
        console.error('Error creating category:', err);
        return res.status(500).json({ error: 'Failed to create category' });
      }
      
      // Fetch the created category
      db.query('SELECT id, name, description, slug FROM categories WHERE id = ?', [result.insertId], (fetchErr, fetchResults) => {
        if (fetchErr) {
          console.error('Error fetching created category:', fetchErr);
          return res.status(500).json({ error: 'Category created but failed to fetch details' });
        }
        
        res.status(201).json(fetchResults[0]);
      });
    });
  });
});

// Update category (admin only)
app.put('/api/admin/categories/:id', ensureAdmin, (req, res) => {
  const categoryId = req.params.id;
  const { name, description, slug } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  // Check if category exists
  db.query('SELECT id FROM categories WHERE id = ?', [categoryId], (err, results) => {
    if (err) {
      console.error('Error checking category existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(results) && results.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check if name or slug already exists (excluding current category)
    db.query('SELECT id FROM categories WHERE (name = ? OR slug = ?) AND id != ?', [name, slug, categoryId], (err, results) => {
      if (err) {
        console.error('Error checking category uniqueness:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (Array.isArray(results) && results.length > 0) {
        return res.status(409).json({ error: 'Category with this name or slug already exists' });
      }
      
      // Create slug from name if not provided
      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      
      // Update category
      const sql = 'UPDATE categories SET name = ?, description = ?, slug = ? WHERE id = ?';
      
      db.query(sql, [name, description || null, finalSlug, categoryId], (err, result) => {
        if (err) {
          console.error('Error updating category:', err);
          return res.status(500).json({ error: 'Failed to update category' });
        }
        
        // Fetch the updated category
        db.query('SELECT id, name, description, slug FROM categories WHERE id = ?', [categoryId], (fetchErr, fetchResults) => {
          if (fetchErr) {
            console.error('Error fetching updated category:', fetchErr);
            return res.status(500).json({ error: 'Category updated but failed to fetch details' });
          }
          
          res.json(fetchResults[0]);
        });
      });
    });
  });
});

// Delete category (admin only)
app.delete('/api/admin/categories/:id', ensureAdmin, (req, res) => {
  const categoryId = req.params.id;
  
  // Check if category exists
  db.query('SELECT id FROM categories WHERE id = ?', [categoryId], (err, results) => {
    if (err) {
      console.error('Error checking category existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(results) && results.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check if category is being used by books or tutorials
    db.query('SELECT COUNT(*) as count FROM books WHERE category_id = ? UNION SELECT COUNT(*) as count FROM tutorials WHERE category_id = ?', [categoryId, categoryId], (err, results) => {
      if (err) {
        console.error('Error checking category usage:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      const totalUsage = results.reduce((sum, result) => sum + (result.count || 0), 0);
      
      if (totalUsage > 0) {
        return res.status(400).json({ error: 'Cannot delete category that is being used by books or tutorials' });
      }
      
      // Delete category
      db.query('DELETE FROM categories WHERE id = ?', [categoryId], (err, result) => {
        if (err) {
          console.error('Error deleting category:', err);
          return res.status(500).json({ error: 'Failed to delete category' });
        }
        
        res.json({ message: 'Category deleted successfully' });
      });
    });
  });
});

// =============================================
// TUTORIALS MANAGEMENT ENDPOINTS
// =============================================

// Get all tutorials with category information
app.get('/api/tutorials', (req, res) => {
  const sql = `
    SELECT 
      t.*,
      c.name as category_name
    FROM tutorials t
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.created_at DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching tutorials:', err);
      return res.status(500).json({ error: 'Failed to fetch tutorials' });
    }
    res.json(results);
  });
});

// Get tutorial by ID
app.get('/api/tutorials/:id', async (req, res) => {
  const tutorialId = req.params.id;
  const userEmail = req.headers['x-user-email'];

  // Log the view event
  try {
    const userId = userEmail ? await getUserIdByEmail(userEmail) : null;
    db.query(
      'INSERT INTO view_logs (user_id, content_id, content_type, ip_address) VALUES (?, ?, ?, ?)',
      [userId, tutorialId, 'tutorial', req.ip]
    );
  } catch (logError) {
    console.error('Failed to log view:', logError);
  }
  
  const sql = `
    SELECT 
      t.*,
      c.name as category_name,
      COALESCE(vl.view_count, 0) as view_count,
      COALESCE(r_up.up_votes, 0) as up_votes,
      COALESCE(r_down.down_votes, 0) as down_votes,
      ur.vote as user_vote
    FROM tutorials t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as view_count
        FROM view_logs
        WHERE content_type = 'tutorial'
        GROUP BY content_id
    ) vl ON t.id = vl.content_id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as up_votes
        FROM ratings
        WHERE content_type = 'tutorial' AND vote = 1
        GROUP BY content_id
    ) r_up ON t.id = r_up.content_id
    LEFT JOIN (
        SELECT content_id, COUNT(*) as down_votes
        FROM ratings
        WHERE content_type = 'tutorial' AND vote = -1
        GROUP BY content_id
    ) r_down ON t.id = r_down.content_id
    LEFT JOIN ratings ur ON ur.content_id = t.id AND ur.content_type = 'tutorial' AND ur.user_id = (SELECT id FROM users WHERE email = ?)
    WHERE t.id = ?
  `;
  
  db.query(sql, [userEmail, tutorialId], (err, results) => {
    if (err) {
      console.error('Error fetching tutorial:', err);
      return res.status(500).json({ error: 'Failed to fetch tutorial' });
    }
    
    if (Array.isArray(results) && results.length === 0) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }
    
    res.json(results[0]);
  });
});

// Record a view for a tutorial (called by client after playback threshold)
app.post('/api/tutorials/:id/views', async (req, res) => {
  const tutorialId = req.params.id;
  const userEmail = req.header('x-user-email') || null;

  if (!tutorialId) {
    return res.status(400).json({ error: 'Tutorial ID is required' });
  }

  try {
    // Optional: resolve user id from email
    let userId = null;
    if (userEmail) {
      try {
        userId = await getUserIdByEmail(userEmail);
      } catch (err) {
        console.warn('Failed to resolve user id for view log:', err);
        userId = null;
      }
    }

    // Insert into view_logs
    db.query(
      'INSERT INTO view_logs (user_id, content_id, content_type, ip_address) VALUES (?, ?, ?, ?)',
      [userId, tutorialId, 'tutorial', req.ip],
      (err) => {
        if (err) {
          console.error('Failed to insert view log:', err);
          // continue to respond with success to avoid breaking UX
        }

        // Return updated view count
        db.query(
          "SELECT COUNT(*) as view_count FROM view_logs WHERE content_type = 'tutorial' AND content_id = ?",
          [tutorialId],
          (countErr, rows) => {
            if (countErr) {
              console.error('Failed to fetch view count:', countErr);
              return res.json({ success: true });
            }
            const count = Array.isArray(rows) && rows[0] ? rows[0].view_count : 0;
            return res.json({ success: true, view_count: count });
          }
        );
      }
    );
  } catch (err) {
    console.error('Error recording tutorial view:', err);
    return res.status(500).json({ error: 'Failed to record view' });
  }
});

// Create new tutorial (admin only)
app.post('/api/admin/tutorials', ensureAdmin, (req, res) => {
  const { 
    title, 
    description, 
    category_id, 
    creator,
    difficulty,
    content_type,
    content_url,
    embed_url,
    file_path
  } = req.body;
  
  if (!title || !category_id) {
    return res.status(400).json({ error: 'title and category_id are required' });
  }
  
  // Check if category exists
  db.query('SELECT id FROM categories WHERE id = ?', [category_id], (err, categoryResults) => {
    if (err) {
      console.error('Error checking category:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(categoryResults) && categoryResults.length === 0) {
      return res.status(400).json({ error: 'Category not found' });
    }
    
    // Insert tutorial
    const sql = `
      INSERT INTO tutorials (
        title, description, category_id, creator, difficulty, content_type, content_url, embed_url, file_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      title, 
      description || null, 
      category_id, 
      creator || null,
      difficulty || 'Beginner',
      content_type || 'Video',
      content_url || null,
      embed_url || null,
      file_path || null
    ];
    
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error creating tutorial:', err);
        return res.status(500).json({ error: 'Failed to create tutorial' });
      }
      
      // Fetch the created tutorial with category info
      const fetchSql = `
        SELECT 
          t.*,
          c.name as category_name
        FROM tutorials t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.id = ?
      `;
      
      db.query(fetchSql, [result.insertId], (fetchErr, fetchResults) => {
        if (fetchErr) {
          console.error('Error fetching created tutorial:', fetchErr);
          return res.status(500).json({ error: 'Tutorial created but failed to fetch details' });
        }
        
        res.status(201).json(fetchResults[0]);
      });
    });
  });
});

// Update tutorial (admin only)
app.put('/api/admin/tutorials/:id', ensureAdmin, (req, res) => {
  const tutorialId = req.params.id;
  const { 
    title, 
    description, 
    category_id, 
    creator,
    difficulty,
    content_type,
    content_url,
    embed_url,
    file_path
  } = req.body;
  
  if (!tutorialId) {
    return res.status(400).json({ error: 'Tutorial ID is required' });
  }
  
  // Check if tutorial exists
  db.query('SELECT id FROM tutorials WHERE id = ?', [tutorialId], (err, tutorialResults) => {
    if (err) {
      console.error('Error checking tutorial existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(tutorialResults) && tutorialResults.length === 0) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }
    
    // Check if category exists if provided
    if (category_id) {
      db.query('SELECT id FROM categories WHERE id = ?', [category_id], (err, categoryResults) => {
        if (err) {
          console.error('Error checking category:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (Array.isArray(categoryResults) && categoryResults.length === 0) {
          return res.status(400).json({ error: 'Category not found' });
        }
        
        updateTutorial();
      });
    } else {
      updateTutorial();
    }
    
    function updateTutorial() {
      const updateFields = [];
      const updateValues = [];
      
      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (creator !== undefined) {
        updateFields.push('creator = ?');
        updateValues.push(creator);
      }
      if (category_id !== undefined) {
        updateFields.push('category_id = ?');
        updateValues.push(category_id);
      }
      if (difficulty !== undefined) {
        updateFields.push('difficulty = ?');
        updateValues.push(difficulty);
      }
      if (content_type !== undefined) {
        updateFields.push('content_type = ?');
        updateValues.push(content_type);
      }
      if (content_url !== undefined) {
        updateFields.push('content_url = ?');
        updateValues.push(content_url);
      }
      if (embed_url !== undefined) {
        updateFields.push('embed_url = ?');
        updateValues.push(embed_url);
      }
      if (file_path !== undefined) {
        updateFields.push('file_path = ?');
        updateValues.push(file_path);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(tutorialId);
      
      const sql = `UPDATE tutorials SET ${updateFields.join(', ')} WHERE id = ?`;
      
      db.query(sql, updateValues, (err) => {
        if (err) {
          console.error('Error updating tutorial:', err);
          return res.status(500).json({ error: 'Failed to update tutorial' });
        }
        
        // Fetch the updated tutorial with category info
        const fetchSql = `
          SELECT 
            t.*,
            c.name as category_name
          FROM tutorials t
          LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.id = ?
        `;
        
        db.query(fetchSql, [tutorialId], (fetchErr, fetchResults) => {
          if (fetchErr) {
            console.error('Error fetching updated tutorial:', fetchErr);
            return res.status(500).json({ error: 'Tutorial updated but failed to fetch details' });
          }
          
          res.json(fetchResults[0]);
        });
      });
    }
  });
});

// Delete tutorial (admin only)
app.delete('/api/admin/tutorials/:id', ensureAdmin, (req, res) => {
  const tutorialId = req.params.id;
  
  if (!tutorialId) {
    return res.status(400).json({ error: 'Tutorial ID is required' });
  }
  
  // Check if tutorial exists
  db.query('SELECT id FROM tutorials WHERE id = ?', [tutorialId], (err, tutorialResults) => {
    if (err) {
      console.error('Error checking tutorial existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(tutorialResults) && tutorialResults.length === 0) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }
    
    // Delete tutorial
    db.query('DELETE FROM tutorials WHERE id = ?', [tutorialId], (err) => {
      if (err) {
        console.error('Error deleting tutorial:', err);
        return res.status(500).json({ error: 'Failed to delete tutorial' });
      }
      
      res.json({ message: 'Tutorial deleted successfully' });
    });
  });
});

// Helper: check if an email belongs to an admin user
async function isEmailAdmin(email) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 1
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE u.email = ? AND r.name = 'admin'
      LIMIT 1
    `;
    db.query(sql, [email], (err, rows) => {
      if (err) return reject(err);
      resolve(Array.isArray(rows) && rows.length > 0);
    });
  });
}

// Middleware: ensure the request comes from an admin
async function ensureAdmin(req, res, next) {
  try {
    const emailHeader = req.header('x-user-email');
    const email = typeof emailHeader === 'string' ? emailHeader.trim() : '';
    if (!email) {
      return res.status(401).json({ error: 'Missing x-user-email header' });
    }
    const isAdmin = await isEmailAdmin(email);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    // Attach to req for downstream usage
    req.userEmail = email;
    next();
  } catch (err) {
    console.error('ensureAdmin error:', err);
    return res.status(500).json({ error: 'Failed to verify admin role' });
  }
}

// Middleware: ensure the request comes from an authenticated user
async function ensureAuthenticated(req, res, next) {
  const userEmail = req.headers['x-user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  try {
    const userId = await getUserIdByEmail(userEmail);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid user. Please log in again.' });
    }
    req.userId = userId; // Attach user ID to the request
    next();
  } catch (err) {
    console.error('ensureAuthenticated error:', err);
    return res.status(500).json({ error: 'Failed to verify user authentication' });
  }
}

// Helper to get user ID from email
async function getUserIdByEmail(email) {
  if (!email) return null;
  return new Promise((resolve, reject) => {
    db.query('SELECT id FROM users WHERE email = ?', [email], (err, rows) => {
      if (err) return reject(err);
      resolve(Array.isArray(rows) && rows.length > 0 ? rows[0].id : null);
    });
  });
}

// Create or ensure role exists and return its id
async function ensureRole(roleName) {
  return new Promise((resolve, reject) => {
    db.query('SELECT id FROM roles WHERE name = ?', [roleName], (err, rows) => {
      if (err) return reject(err);
      if (Array.isArray(rows) && rows.length > 0) {
        return resolve(rows[0].id);
      }
      db.query('INSERT INTO roles (name) VALUES (?)', [roleName], (insertErr, result) => {
        if (insertErr) return reject(insertErr);
        resolve(result.insertId);
      });
    });
  });
}

// Helper to hash password using bcryptjs
function hashPassword(plain) {
  const rounds = process.env.BCRYPT_SALT_ROUNDS ? Number(process.env.BCRYPT_SALT_ROUNDS) : 12;
  return bcrypt.hashSync(plain, rounds);
}

// Admin setup endpoint: creates a user and assigns the admin role
app.post('/api/admin/setup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'email, password, and displayName are required' });
    }

    // Check if user exists
    const existing = await new Promise((resolve, reject) => {
      db.query('SELECT id FROM users WHERE email = ?', [email], (err, rows) => {
        if (err) return reject(err);
        resolve(Array.isArray(rows) && rows.length > 0 ? rows[0] : null);
      });
    });
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Derive username from displayName or email local part
    const usernameBase = String(displayName).trim() || String(email).split('@')[0];
    const username = usernameBase.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || String(email).split('@')[0];
    const passwordHash = hashPassword(password);

    // Insert user
    const userId = await new Promise((resolve, reject) => {
      db.query(
        'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
        [username, email, passwordHash, displayName, null],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.insertId);
        }
      );
    });

    // Ensure admin role exists and assign
    const adminRoleId = await ensureRole('admin');
    await new Promise((resolve, reject) => {
      db.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [userId, adminRoleId],
        (err) => (err ? reject(err) : resolve())
      );
    });

    return res.status(201).json({ id: userId, email, username, role: 'admin' });
  } catch (error) {
    console.error('Admin setup error:', error);
    return res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Get a user's role(s) by email
app.get('/api/users/role', (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email query param is required' });
  }

  // Fetch role names for the user identified by email
  const sql = `
    SELECT r.name AS role
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    WHERE u.email = ?
  `;

  db.query(sql, [email], (err, rows) => {
    if (err) {
      console.error('Error fetching user role:', err);
      return res.status(500).json({ error: 'Failed to fetch user role' });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.json({ role: null, roles: [] });
    }
    const roles = rows.map(r => r.role);
    const role = roles.includes('admin') ? 'admin' : (roles.includes('moderator') ? 'moderator' : 'user');
    return res.json({ role, roles });
  });
});

// Ratings Endpoint
app.post('/api/ratings', ensureAuthenticated, async (req, res) => {
  const { userId } = req;
  const { content_type, content_id, vote } = req.body;

  if (!content_type || !content_id || !vote) {
    return res.status(400).json({ error: 'content_type, content_id, and vote are required' });
  }
  if (!['book', 'tutorial'].includes(content_type)) {
    return res.status(400).json({ error: "Invalid content_type. Must be 'book' or 'tutorial'." });
  }
  if (!['up', 'down'].includes(vote)) {
    return res.status(400).json({ error: "Invalid vote. Must be 'up' or 'down'." });
  }

  const voteValue = vote === 'up' ? 1 : -1;

  try {
    const existingVoteSql = 'SELECT vote FROM ratings WHERE user_id = ? AND content_type = ? AND content_id = ?';
    db.query(existingVoteSql, [userId, content_type, content_id], (err, results) => {
      if (err) {
        console.error('Error checking existing vote:', err);
        return res.status(500).json({ error: 'Database error while checking vote' });
      }

      if (results.length > 0) {
        const currentVote = results[0].vote;
        if (currentVote === voteValue) {
          const deleteSql = 'DELETE FROM ratings WHERE user_id = ? AND content_type = ? AND content_id = ?';
          db.query(deleteSql, [userId, content_type, content_id], (deleteErr) => {
            if (deleteErr) {
              console.error('Error deleting vote:', deleteErr);
              return res.status(500).json({ error: 'Failed to remove vote' });
            }
            res.json({ message: 'Vote removed successfully' });
          });
        } else {
          const updateSql = 'UPDATE ratings SET vote = ? WHERE user_id = ? AND content_type = ? AND content_id = ?';
          db.query(updateSql, [voteValue, userId, content_type, content_id], (updateErr) => {
            if (updateErr) {
              console.error('Error updating vote:', updateErr);
              return res.status(500).json({ error: 'Failed to update vote' });
            }
            res.json({ message: 'Vote updated successfully' });
          });
        }
      } else {
        const insertSql = 'INSERT INTO ratings (user_id, content_type, content_id, vote) VALUES (?, ?, ?, ?)';
        db.query(insertSql, [userId, content_type, content_id, voteValue], (insertErr) => {
          if (insertErr) {
            console.error('Error inserting vote:', insertErr);
            return res.status(500).json({ error: 'Failed to cast vote' });
          }
          res.status(201).json({ message: 'Vote cast successfully' });
        });
      }
    });
  } catch (error) {
    console.error('Error processing vote:', error);
    res.status(500).json({ error: 'An unexpected error occurred during voting' });
  }
});

// User Management Endpoints

// Get all users (admin only)
app.get('/api/admin/users', ensureAdmin, (req, res) => {
  const sql = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.first_name,
      u.last_name,
      u.created_at,
      u.updated_at,
      CASE 
        WHEN r.name = 'admin' THEN 'admin'
        WHEN r.name = 'moderator' THEN 'moderator'
        ELSE 'user'
      END as role,
      CASE 
        WHEN u.is_active IS NULL THEN 1
        ELSE u.is_active
      END as is_active,
      u.last_login,
      u.profile_image,
      COALESCE(dl.download_count, 0) as total_downloads,
      COALESCE(vl.view_count, 0) as total_views
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as download_count
      FROM download_logs
      GROUP BY user_id
    ) dl ON u.id = dl.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as view_count
      FROM view_logs
      WHERE user_id IS NOT NULL
      GROUP BY user_id
    ) vl ON u.id = vl.user_id
    ORDER BY u.created_at DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json({ users: results });
  });
});

// Create new user (admin only)
app.post('/api/admin/users', ensureAdmin, (req, res) => {
  const { username, email, first_name, last_name, role, password } = req.body;
  
  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'username, email, password, and role are required' });
  }
  
  if (!['user', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be user, moderator, or admin' });
  }
  
  // Check if user already exists
  db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], async (err, rows) => {
    if (err) {
      console.error('Error checking existing user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(rows) && rows.length > 0) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }
    
    try {
      const passwordHash = hashPassword(password);
      
      // Insert user
      db.query(
        'INSERT INTO users (username, email, password_hash, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [username, email, passwordHash, first_name || null, last_name || null],
        async (err, result) => {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Failed to create user' });
          }
          
          const userId = result.insertId;
          
          // Ensure role exists and assign
          const roleId = await ensureRole(role);
          db.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
            [userId, roleId],
            (err) => {
              if (err) {
                console.error('Error assigning role:', err);
                return res.status(500).json({ error: 'User created but role assignment failed' });
              }
              
              // Return created user
              res.status(201).json({ 
                user: { 
                  id: userId, 
                  username, 
                  email, 
                  first_name, 
                  last_name, 
                  role,
                  is_active: true,
                  created_at: new Date(),
                  last_login: null,
                  profile_image: null,
                  total_downloads: 0,
                  total_views: 0
                } 
              });
            }
          );
        }
      );
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });
});

// Update user (admin only)
app.put('/api/admin/users/:id', ensureAdmin, (req, res) => {
  const userId = req.params.id;
  const { username, email, first_name, last_name, role } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  // Check if user exists
  db.query('SELECT id FROM users WHERE id = ?', [userId], (err, rows) => {
    if (err) {
      console.error('Error checking user existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(rows) && rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user
    const updateFields = [];
    const updateValues = [];
    
    if (username !== undefined) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (first_name !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(first_name);
    }
    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(last_name);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateValues.push(userId);
    
    db.query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues,
      async (err) => {
        if (err) {
          console.error('Error updating user:', err);
          return res.status(500).json({ error: 'Failed to update user' });
        }
        
        // Update role if provided
        if (role && ['user', 'moderator', 'admin'].includes(role)) {
          try {
            const roleId = await ensureRole(role);
            
            // Remove existing roles
            db.query('DELETE FROM user_roles WHERE user_id = ?', [userId], (err) => {
              if (err) {
                console.error('Error removing existing roles:', err);
                return res.status(500).json({ error: 'User updated but role update failed' });
              }
              
              // Assign new role
              db.query(
                'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
                [userId, roleId],
                (err) => {
                  if (err) {
                    console.error('Error assigning new role:', err);
                    return res.status(500).json({ error: 'User updated but role assignment failed' });
                  }
                  
                  res.json({ message: 'User updated successfully' });
                }
              );
            });
          } catch (error) {
            console.error('Error updating role:', error);
            return res.status(500).json({ error: 'User updated but role update failed' });
          }
        } else {
          res.json({ message: 'User updated successfully' });
        }
      }
    );
  });
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', ensureAdmin, (req, res) => {
  const userId = req.params.id;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  // Check if user exists
  db.query('SELECT id FROM users WHERE id = ?', [userId], (err, rows) => {
    if (err) {
      console.error('Error checking user existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(rows) && rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user (cascade will handle related records)
    db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
      if (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ error: 'Failed to delete user' });
      }
      
      res.json({ message: 'User deleted successfully' });
    });
  });
});

// Update user status (admin only)
app.patch('/api/admin/users/:id/status', ensureAdmin, (req, res) => {
  const userId = req.params.id;
  const { is_active } = req.body;
  
  if (!userId || typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'User ID and is_active boolean are required' });
  }
  
  // Check if user exists
  db.query('SELECT id FROM users WHERE id = ?', [userId], (err, rows) => {
    if (err) {
      console.error('Error checking user existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (Array.isArray(rows) && rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user status
    db.query(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [is_active ? 1 : 0, userId],
      (err) => {
        if (err) {
          console.error('Error updating user status:', err);
          return res.status(500).json({ error: 'Failed to update user status' });
        }
        
        res.json({ message: 'User status updated successfully' });
      }
    );
  });
});

// Get user statistics (admin only)
app.get('/api/admin/users/stats', ensureAdmin, (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN is_active = 1 OR is_active IS NULL THEN 1 ELSE 0 END) as active_users,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users
    FROM users
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching user stats:', err);
      return res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
    
    const stats = results[0];
    
    // Get role breakdown
    const roleSql = `
      SELECT 
        r.name as role,
        COUNT(*) as count
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      GROUP BY r.name
    `;
    
    db.query(roleSql, (err, roleResults) => {
      if (err) {
        console.error('Error fetching role stats:', err);
        return res.status(500).json({ error: 'Failed to fetch role statistics' });
      }
      
      const users_by_role = {};
      roleResults.forEach(row => {
        users_by_role[row.role] = row.count;
      });
      
      res.json({ 
        stats: {
          ...stats,
          users_by_role
        }
      });
    });
  });
});

// Search users (admin only)
app.get('/api/admin/users/search', ensureAdmin, (req, res) => {
  const { q, role, status } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  let sql = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.first_name,
      u.last_name,
      u.created_at,
      u.updated_at,
      CASE 
        WHEN r.name = 'admin' THEN 'admin'
        WHEN r.name = 'moderator' THEN 'moderator'
        ELSE 'user'
      END as role,
      CASE 
        WHEN u.is_active IS NULL THEN 1
        ELSE u.is_active
      END as is_active,
      u.last_login,
      u.profile_image,
      COALESCE(dl.download_count, 0) as total_downloads,
      COALESCE(vl.view_count, 0) as total_views
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as download_count
      FROM download_logs
      GROUP BY user_id
    ) dl ON u.id = dl.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as view_count
      FROM view_logs
      WHERE user_id IS NOT NULL
      GROUP BY user_id
    ) vl ON u.id = vl.user_id
    WHERE (u.username LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)
  `;
  
  const searchTerm = `%${q}%`;
  const params = [searchTerm, searchTerm, searchTerm, searchTerm];
  
  if (role && role !== 'all') {
    sql += ' AND r.name = ?';
    params.push(role);
  }
  
  if (status && status !== 'all') {
    if (status === 'active') {
      sql += ' AND (u.is_active = 1 OR u.is_active IS NULL)';
    } else {
      sql += ' AND u.is_active = 0';
    }
  }
  
  sql += ' ORDER BY u.created_at DESC';
  
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error searching users:', err);
      return res.status(500).json({ error: 'Failed to search users' });
    }
    
    res.json({ users: results });
  });
});

// Example protected admin route
app.post('/api/admin/books', ensureAdmin, (req, res) => {
  // This is just a placeholder to demonstrate protection – implement actual insert later
  return res.json({ ok: true, message: 'Admin route accessed', by: req.userEmail });
});

// Analytics endpoints (admin only)
app.get('/api/admin/analytics', ensureAdmin, (req, res) => {
  try {
    // Get user metrics
    const userSql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as newThisMonth,
        COUNT(CASE WHEN updated_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK) THEN 1 END) as activeThisWeek
      FROM users
    `;
    
    db.query(userSql, (err, userResults) => {
      if (err) {
        console.error('Error fetching user metrics:', err);
        return res.status(500).json({ error: 'Failed to fetch user metrics' });
      }
      
      // Get content metrics
      const contentSql = `
        SELECT 
          (SELECT COUNT(*) FROM books) as totalBooks,
          (SELECT COUNT(*) FROM tutorials) as totalTutorials,
          (SELECT COUNT(*) FROM categories) as totalCategories
      `;
      
      db.query(contentSql, (err, contentResults) => {
        if (err) {
          console.error('Error fetching content metrics:', err);
          return res.status(500).json({ error: 'Failed to fetch content metrics' });
        }
        
        // Get engagement metrics
        const engagementSql = `
          SELECT 
            (SELECT COUNT(*) FROM view_logs) as totalViews,
            (SELECT COUNT(*) FROM download_logs) as totalDownloads,
            (SELECT COUNT(*) FROM ratings) as totalRatings
        `;
        
        db.query(engagementSql, (err, engagementResults) => {
          if (err) {
            console.error('Error fetching engagement metrics:', err);
            return res.status(500).json({ error: 'Failed to fetch engagement metrics' });
          }
          
          // Get top performing content
          const topContentSql = `
            SELECT 
              'book' as type,
              b.id,
              b.title,
              COALESCE(vl.view_count, 0) as views,
              COALESCE(dl.download_count, 0) as downloads,
              c.name as category
            FROM books b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN (
              SELECT content_id, COUNT(*) as view_count 
              FROM view_logs 
              WHERE content_type = 'book' 
              GROUP BY content_id
            ) vl ON b.id = vl.content_id
            LEFT JOIN (
              SELECT content_id, COUNT(*) as download_count 
              FROM download_logs 
              WHERE content_type = 'book' 
              GROUP BY content_id
            ) dl ON b.id = dl.content_id
            
            UNION ALL
            
            SELECT 
              'tutorial' as type,
              t.id,
              t.title,
              COALESCE(vl.view_count, 0) as views,
              0 as downloads,
              c.name as category
            FROM tutorials t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN (
              SELECT content_id, COUNT(*) as view_count 
              FROM view_logs 
              WHERE content_type = 'tutorial' 
              GROUP BY content_id
            ) vl ON t.id = vl.content_id
            
            ORDER BY views DESC
            LIMIT 10
          `;
          
          db.query(topContentSql, (err, topContentResults) => {
            if (err) {
              console.error('Error fetching top content:', err);
              return res.status(500).json({ error: 'Failed to fetch top content' });
            }
            
            // Get category statistics
            const categorySql = `
              SELECT 
                c.name,
                COUNT(DISTINCT b.id) as bookCount,
                COUNT(DISTINCT t.id) as tutorialCount,
                COALESCE(SUM(vl.view_count), 0) as totalViews
              FROM categories c
              LEFT JOIN books b ON c.id = b.category_id
              LEFT JOIN tutorials t ON c.id = t.category_id
              LEFT JOIN (
                SELECT 
                  CASE 
                    WHEN vl.content_type = 'book' THEN b.category_id
                    WHEN vl.content_type = 'tutorial' THEN t.category_id
                  END as category_id,
                  COUNT(*) as view_count
                FROM view_logs vl
                LEFT JOIN books b ON vl.content_id = b.id AND vl.content_type = 'book'
                LEFT JOIN tutorials t ON vl.content_id = t.id AND vl.content_type = 'tutorial'
                GROUP BY category_id
              ) vl ON c.id = vl.category_id
              GROUP BY c.id, c.name
              ORDER BY totalViews DESC
            `;
            
            db.query(categorySql, (err, categoryResults) => {
              if (err) {
                console.error('Error fetching category stats:', err);
                return res.status(500).json({ error: 'Failed to fetch category statistics' });
              }
              
              const analyticsData = {
                users: {
                  total: userResults[0]?.total || 0,
                  newThisMonth: userResults[0]?.newThisMonth || 0,
                  activeThisWeek: userResults[0]?.activeThisWeek || 0,
                },
                content: {
                  totalBooks: contentResults[0]?.totalBooks || 0,
                  totalTutorials: contentResults[0]?.totalTutorials || 0,
                  totalCategories: contentResults[0]?.totalCategories || 0,
                },
                engagement: {
                  totalViews: engagementResults[0]?.totalViews || 0,
                  totalDownloads: engagementResults[0]?.totalDownloads || 0,
                  totalRatings: engagementResults[0]?.totalRatings || 0,
                },
                topContent: topContentResults.map((item) => ({
                  id: item.id,
                  title: item.title,
                  type: item.type,
                  views: item.views || 0,
                  downloads: item.downloads || 0,
                  category: item.category || 'Uncategorized',
                })),
                categoryStats: categoryResults.map((item) => ({
                  name: item.name,
                  bookCount: item.bookCount || 0,
                  tutorialCount: item.tutorialCount || 0,
                  totalViews: item.totalViews || 0,
                })),
              };
              
              res.json(analyticsData);
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

app.get('/api/admin/analytics/user-growth', ensureAdmin, (req, res) => {
  const months = parseInt(req.query.months) || 6;
  
  const sql = `
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m') as month,
      COUNT(*) as newUsers,
      SUM(COUNT(*)) OVER (ORDER BY DATE_FORMAT(created_at, '%Y-%m')) as totalUsers
    FROM users
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month
  `;
  
  db.query(sql, [months], (err, results) => {
    if (err) {
      console.error('Error fetching user growth:', err);
      return res.status(500).json({ error: 'Failed to fetch user growth data' });
    }
    res.json(results);
  });
});

// Get recent activity for dashboard
app.get('/api/admin/analytics/recent-activity', ensureAdmin, (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const sql = `
    SELECT 
      'book' as type,
      b.id,
      b.title,
      b.author,
      b.created_at,
      'New book added' as action
    FROM books b
    WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    
    UNION ALL
    
    SELECT 
      'tutorial' as type,
      t.id,
      t.title,
      'System' as author,
      t.created_at,
      'New tutorial published' as action
    FROM tutorials t
    WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    
    ORDER BY created_at DESC
    LIMIT ?
  `;
  
  db.query(sql, [limit], (err, results) => {
    if (err) {
      console.error('Error fetching recent activity:', err);
      return res.status(500).json({ error: 'Failed to fetch recent activity data' });
    }
    
    // Format the results for the frontend
    const formattedResults = results.map(item => ({
      id: item.id,
      action: `${item.action}: ${item.title}`,
      time: formatTimeAgo(item.created_at),
      author: item.author,
      type: item.type,
      created_at: item.created_at
    }));
    
    res.json(formattedResults);
  });
});

// Helper function to format time ago
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}

app.get('/api/admin/analytics/daily-activity', ensureAdmin, (req, res) => {
  const days = parseInt(req.query.days) || 7;
  
  const sql = `
    SELECT 
      DATE(vl.viewed_at) as date,
      COUNT(DISTINCT vl.user_id) as activeUsers,
      COUNT(*) as pageViews
    FROM view_logs vl
    WHERE vl.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DATE(vl.viewed_at)
    ORDER BY date DESC
    LIMIT ?
  `;
  
  db.query(sql, [days, days], (err, results) => {
    if (err) {
      console.error('Error fetching daily activity:', err);
      return res.status(500).json({ error: 'Failed to fetch daily activity data' });
    }
    
    // Get downloads separately to avoid GROUP BY issues
    const downloadSql = `
      SELECT 
        DATE(downloaded_at) as date,
        COUNT(*) as downloads
      FROM download_logs 
      WHERE downloaded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(downloaded_at)
    `;
    
    db.query(downloadSql, [days], (downloadErr, downloadResults) => {
      if (downloadErr) {
        console.error('Error fetching download data:', downloadErr);
        // Return results without downloads if there's an error
        return res.json(results.map(item => ({ ...item, downloads: 0 })));
      }
      
      // Merge the results - include dates that have downloads but no views
      const mergedByDate = {};
      // Initialize map with view results
      (results || []).forEach(item => {
        const dateKey = item.date;
        mergedByDate[dateKey] = {
          date: dateKey,
          activeUsers: item.activeUsers || 0,
          pageViews: item.pageViews || 0,
          downloads: 0
        };
      });
      // Merge download counts, adding missing dates if necessary
      (downloadResults || []).forEach(d => {
        const dateKey = d.date;
        if (mergedByDate[dateKey]) {
          mergedByDate[dateKey].downloads = d.downloads || 0;
        } else {
          mergedByDate[dateKey] = {
            date: dateKey,
            activeUsers: 0,
            pageViews: 0,
            downloads: d.downloads || 0
          };
        }
      });
      // Convert to array and sort by date desc, then limit to requested days
      const mergedResults = Object.values(mergedByDate)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, days);
      res.json(mergedResults);
    });
  });
});

// Initialize default categories if database is empty
const initializeDefaultCategories = async () => {
  try {
    // Check if categories table has any data
    db.query('SELECT COUNT(*) as count FROM categories', (err, results) => {
      if (err) {
        console.error('Error checking categories count:', err);
        return;
      }
      
      const count = results[0]?.count || 0;
      
      if (count === 0) {
        console.log('No categories found, initializing default categories...');
        
        const defaultCategories = [
          { name: 'Web Development', description: 'Books and tutorials about web development technologies' },
          { name: 'Database', description: 'Database design, SQL, and data management resources' },
          { name: 'Cybersecurity', description: 'Security, ethical hacking, and network protection' },
          { name: 'Programming', description: 'General programming languages and software development' },
          { name: 'Data Science', description: 'Machine learning, AI, and data analysis' },
          { name: 'Mobile Development', description: 'iOS, Android, and cross-platform mobile development' }
        ];
        
        defaultCategories.forEach((category, index) => {
          const slug = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const sql = 'INSERT INTO categories (name, description, slug) VALUES (?, ?, ?)';
          
          db.query(sql, [category.name, category.description, slug], (insertErr) => {
            if (insertErr) {
              console.error(`Error inserting category ${category.name}:`, insertErr);
            } else {
              console.log(`Created default category: ${category.name}`);
            }
          });
        });
      } else {
        console.log(`Found ${count} existing categories`);
      }
    });
  } catch (error) {
    console.error('Error initializing default categories:', error);
  }
};

// File Upload Endpoint (updated to optionally upload to S3)
app.post('/api/admin/upload-file', upload.single('file'), async (req, res) => {
  try {
    console.log('/api/admin/upload-file called', { file: req.file && { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size }, bodyKeys: Object.keys(req.body || {}) });
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userEmail = req.body.userEmail;
    if (!userEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const localFilePath = `/uploads/${req.file.filename}`;

    // If S3 is configured, upload to S3 and remove local file
    if (s3Client) {
      const fileStream = createReadStream(join(uploadsDir, req.file.filename));
      const key = `books/${Date.now()}_${req.file.filename}`;
      const putCommand = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: fileStream,
        ContentType: req.file.mimetype
      });

      await s3Client.send(putCommand);

      // Optionally remove local file after upload
      try { unlinkSync(join(uploadsDir, req.file.filename)); } catch (e) {}

      const s3Path = `s3://${S3_BUCKET}/${key}`;

      res.json({
        success: true,
        filePath: s3Path,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      console.log(`File uploaded to S3: ${key} by ${userEmail}`);
      return;
    }

    // Fallback: return local uploads path
    res.json({
      success: true,
      filePath: localFilePath,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    console.log(`File uploaded: ${req.file.originalname} (${req.file.size} bytes) by ${userEmail}`);
  } catch (error) {
    console.error('Error uploading file:', error);
    // Emit error details when in development for easier debugging
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({ error: 'Failed to upload file', details: error && error.message });
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Create tutorial (admin only)
app.post('/api/admin/tutorials', ensureAdmin, (req, res) => {
  const { title, content, category_id } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  const sql = "INSERT INTO tutorials (title, content, category_id) VALUES (?, ?, ?)";
  const values = [title, content, category_id || null];
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error creating tutorial:', err);
      return res.status(500).json({ error: 'Failed to create tutorial' });
    }
    const fetchSql = `
      SELECT t.*, c.name as category_name
      FROM tutorials t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `;
    db.query(fetchSql, [result.insertId], (fetchErr, fetchResults) => {
      if (fetchErr) {
        console.error('Error fetching created tutorial:', fetchErr);
        return res.status(500).json({ error: 'Tutorial created but failed to fetch details' });
      }
      res.status(201).json(fetchResults[0]);
    });
  });
});

// Admin endpoint for generating thumbnails from files
app.post('/api/admin/generate-thumbnail', ensureAdmin, async (req, res) => {
  const { filePath, type } = req.body;
  
  console.log('Admin thumbnail generation request:', { filePath, type });
  
  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }
  
  try {
    let thumbnailPath = null;
    
    if (type === 'pdf' || filePath.toLowerCase().endsWith('.pdf')) {
      // Generate PDF thumbnail
      const diskPath = filePath.startsWith('/uploads/') 
        ? join(process.cwd(), filePath.replace(/^\//, ''))
        : filePath;
      
      console.log('PDF processing:', { 
        originalPath: filePath, 
        diskPath, 
        exists: existsSync(diskPath),
        cwd: process.cwd()
      });
      
      if (!existsSync(diskPath)) {
        return res.status(404).json({ error: 'PDF file not found' });
      }
      
      // Check file size
      const stats = require('fs').statSync(diskPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      if (fileSizeMB > 50) {
        return res.status(413).json({ error: 'PDF file too large for thumbnail generation' });
      }
      
      // Generate thumbnail
      const options = {
        density: 150,
        saveFilename: `thumb_${Date.now()}`,
        savePath: tmpdir(),
        format: 'png',
        width: 300,
        height: 400
      };
      
      try {
        const pageData = await safePdfToImage(diskPath, options, 30000);
        
        if (!pageData || !pageData.path) {
          throw new Error('Failed to convert PDF page');
        }
        
        // Process with Sharp
        const thumbnailBuffer = await sharp(pageData.path)
          .resize(300, 400, { fit: 'inside', withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png({ quality: 90 })
          .toBuffer();
        
        // Save thumbnail to uploads directory
        const thumbnailFilename = `thumbnail_${Date.now()}.png`;
        const thumbnailFullPath = join(uploadsDir, thumbnailFilename);
        require('fs').writeFileSync(thumbnailFullPath, thumbnailBuffer);
        
        // Return the web-accessible path
        thumbnailPath = `/uploads/${thumbnailFilename}`;
        
        // Clean up temporary files
        try {
          if (existsSync(pageData.path)) {
            unlinkSync(pageData.path);
          }
        } catch (cleanupError) {
          console.warn('Warning: Failed to clean up temporary file:', cleanupError);
        }
        
      } catch (pdfError) {
        console.error('PDF conversion error:', pdfError);
        throw new Error(`PDF conversion failed: ${pdfError.message}`);
      }
      
    } else if (type && type.startsWith('image/')) {
      // Generate thumbnail from image
      const diskPath = filePath.startsWith('/uploads/') 
        ? join(process.cwd(), filePath.replace(/^\//, ''))
        : filePath;
      
      if (!existsSync(diskPath)) {
        return res.status(404).json({ error: 'Image file not found' });
      }
      
      try {
        // Process with Sharp
        const thumbnailBuffer = await sharp(diskPath)
          .resize(300, 400, { fit: 'inside', withoutEnlargement: true, background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png({ quality: 90 })
          .toBuffer();
        
        // Save thumbnail
        const thumbnailFilename = `thumbnail_${Date.now()}.png`;
        const thumbnailFullPath = join(uploadsDir, thumbnailFilename);
        require('fs').writeFileSync(thumbnailFullPath, thumbnailBuffer);
        
        // Return the web-accessible path
        thumbnailPath = `/uploads/${thumbnailFilename}`;
        
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        throw new Error(`Image processing failed: ${imageError.message}`);
      }
    }
    
    if (thumbnailPath) {
      res.json({ thumbnailPath });
    } else {
      res.status(400).json({ error: 'Unsupported file type for thumbnail generation' });
    }
    
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).json({ 
      error: 'Failed to generate thumbnail',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Admin endpoint for scraping cover images from URLs
app.post('/api/admin/scrape-cover', ensureAdmin, async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    let coverUrl = null;
    
    // Handle Amazon URLs
    if (url.includes('amazon.com') || url.includes('amazon.co.uk') || url.includes('a.co') || url.includes('amazon.ca')) {
      // Extract ASIN from Amazon URL
      const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
      if (asinMatch) {
        const asin = asinMatch[1];
        // Use Amazon's image URL format
        coverUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.L.jpg`;
      }
    }
    
    // Handle Goodreads URLs
    else if (url.includes('goodreads.com')) {
      // For Goodreads, we'd need to scrape the page
      // This is a simplified approach - in production you might want to use a proper scraping service
      coverUrl = null; // Would need proper implementation
    }
    
    // Handle other book retailer URLs
    else if (url.includes('bookdepository.com') || url.includes('waterstones.com')) {
      // These would need custom scraping logic
      coverUrl = null;
    }
    
    if (coverUrl) {
      res.json({ coverUrl });
    } else {
      res.status(404).json({ error: 'Could not extract cover from this URL' });
    }
    
  } catch (error) {
    console.error('Error scraping cover:', error);
    res.status(500).json({ error: 'Failed to scrape cover image' });
  }
});

const PORT = process.env.PORT || 5000;

// Add process signal handlers to prevent EPIPE errors
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Gracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Gracefully shutting down...');
  process.exit(0);
});

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log the error but don't crash the server
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log the error but don't crash the server
});

// Handle EPIPE errors specifically
process.on('error', (error) => {
  if (error.code === 'EPIPE') {
    console.warn('EPIPE error detected, continuing...');
  } else {
    console.error('Process error:', error);
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Initialize default categories after server starts
  initializeDefaultCategories();
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});

// Graceful shutdown for the server
server.on('close', () => {
  console.log('Server closed');
});
