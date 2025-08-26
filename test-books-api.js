// Test script for Books API endpoints
// Run with: node test-books-api.js

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testBook = {
  title: 'Test Book Title',
  author: 'Test Author',
  description: 'This is a test book description',
  file_path: '/books/test-book.pdf',
  category_id: '1', // Assuming category 1 exists
  isbn: '978-1234567890',
  published_year: 2024,
  page_count: 250
};

const testUserEmail = 'admin@example.com'; // Replace with actual admin email

async function testBooksAPI() {
  console.log('🧪 Testing Books API endpoints...\n');

  try {
    // Test 1: Get all books
    console.log('1️⃣ Testing GET /api/books...');
    const booksResponse = await fetch(`${BASE_URL}/books`);
    const books = await booksResponse.json();
    console.log(`✅ Found ${books.length} books`);
    console.log('📚 Books:', books.map(b => ({ id: b.id, title: b.title, author: b.author })));
    console.log('');

    // Test 2: Get categories
    console.log('2️⃣ Testing GET /api/categories...');
    const categoriesResponse = await fetch(`${BASE_URL}/categories`);
    const categories = await categoriesResponse.json();
    console.log(`✅ Found ${categories.length} categories`);
    console.log('🏷️ Categories:', categories.map(c => ({ id: c.id, name: c.name })));
    console.log('');

    // Test 3: Create a new book
    console.log('3️⃣ Testing POST /api/admin/books...');
    const createResponse = await fetch(`${BASE_URL}/admin/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': testUserEmail
      },
      body: JSON.stringify(testBook)
    });

    if (createResponse.ok) {
      const createdBook = await createResponse.json();
      console.log('✅ Book created successfully');
      console.log('📖 Created book:', { id: createdBook.id, title: createdBook.title, author: createdBook.author });
      
      const bookId = createdBook.id;
      console.log('');

      // Test 4: Get book by ID
      console.log('4️⃣ Testing GET /api/books/:id...');
      const getBookResponse = await fetch(`${BASE_URL}/books/${bookId}`);
      if (getBookResponse.ok) {
        const fetchedBook = await getBookResponse.json();
        console.log('✅ Book fetched successfully');
        console.log('📖 Fetched book:', { id: fetchedBook.id, title: fetchedBook.title, author: fetchedBook.author });
      } else {
        console.log('❌ Failed to fetch book');
      }
      console.log('');

      // Test 5: Update book
      console.log('5️⃣ Testing PUT /api/admin/books/:id...');
      const updateData = { ...testBook, title: 'Updated Test Book Title' };
      const updateResponse = await fetch(`${BASE_URL}/admin/books/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': testUserEmail
        },
        body: JSON.stringify(updateData)
      });

      if (updateResponse.ok) {
        const updatedBook = await updateResponse.json();
        console.log('✅ Book updated successfully');
        console.log('📖 Updated book:', { id: updatedBook.id, title: updatedBook.title, author: updatedBook.author });
      } else {
        console.log('❌ Failed to update book');
      }
      console.log('');

      // Test 6: Delete book
      console.log('6️⃣ Testing DELETE /api/admin/books/:id...');
      const deleteResponse = await fetch(`${BASE_URL}/admin/books/${bookId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': testUserEmail
        }
      });

      if (deleteResponse.ok) {
        console.log('✅ Book deleted successfully');
      } else {
        console.log('❌ Failed to delete book');
      }
      console.log('');

    } else {
      const errorData = await createResponse.json();
      console.log('❌ Failed to create book:', errorData.error);
      console.log('💡 Make sure you have admin privileges and the server is running');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('💡 Make sure the server is running on port 5000');
  }
}

// Run the tests
testBooksAPI();
