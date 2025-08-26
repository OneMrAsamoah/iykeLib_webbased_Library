// Debug script for thumbnail generation
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000'; // Your server port

async function debugThumbnail() {
  console.log('🔍 Debugging Thumbnail Generation...\n');

  // Test 1: Check if endpoint is accessible
  console.log('1️⃣ Testing endpoint accessibility...');
  try {
    const response = await fetch(`${BASE_URL}/api/test-thumbnail`);
    const data = await response.json();
    console.log('✅ Test endpoint working:', data);
  } catch (error) {
    console.log('❌ Test endpoint failed:', error.message);
    return;
  }

  // Test 2: Test with non-existent file
  console.log('\n2️⃣ Testing with non-existent file...');
  try {
    const response = await fetch(`${BASE_URL}/api/generate-thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: '/uploads/nonexistent.pdf',
        type: 'pdf'
      })
    });
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  // Test 3: Test with valid file path (if you have one)
  console.log('\n3️⃣ Testing with valid file path...');
  try {
    const response = await fetch(`${BASE_URL}/api/generate-thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: '/uploads/test-book.pdf', // Change this to a real file path
        type: 'pdf'
      })
    });
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n🎯 Debug completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Check your server console for detailed logs');
  console.log('2. Verify the file path exists in your uploads directory');
  console.log('3. Make sure you have a PDF file to test with');
  console.log('4. Check if the uploads directory exists and has proper permissions');
}

debugThumbnail().catch(console.error);
