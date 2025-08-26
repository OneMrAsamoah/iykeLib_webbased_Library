// Test script for admin endpoints
const fetch = require('node-fetch');

async function testEndpoints() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🧪 Testing Admin Endpoints...\n');
  
  try {
    // Test 1: Basic server connectivity
    console.log('1️⃣ Testing basic server connectivity...');
    const testResponse = await fetch(`${baseUrl}/api/test-thumbnail`);
    if (testResponse.ok) {
      console.log('✅ Server is running and responding');
    } else {
      console.log('❌ Server test failed');
      return;
    }
    
    // Test 2: Admin thumbnail generation endpoint
    console.log('\n2️⃣ Testing admin thumbnail generation endpoint...');
    const thumbnailResponse = await fetch(`${baseUrl}/api/admin/generate-thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'admin@test.com' // Mock admin email
      },
      body: JSON.stringify({
        filePath: '/uploads/test.pdf'
      })
    });
    
    if (thumbnailResponse.ok) {
      const data = await thumbnailResponse.json();
      console.log('✅ Admin thumbnail endpoint working:', data);
    } else {
      const errorData = await thumbnailResponse.text();
      console.log('❌ Admin thumbnail endpoint failed:', thumbnailResponse.status, errorData);
    }
    
    // Test 3: Admin scrape cover endpoint
    console.log('\n3️⃣ Testing admin scrape cover endpoint...');
    const scrapeResponse = await fetch(`${baseUrl}/api/admin/scrape-cover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'admin@test.com' // Mock admin email
      },
      body: JSON.stringify({
        url: 'https://amazon.com/dp/B08N5WRWNW'
      })
    });
    
    if (scrapeResponse.ok) {
      const data = await scrapeResponse.json();
      console.log('✅ Admin scrape cover endpoint working:', data);
    } else {
      const errorData = await scrapeResponse.text();
      console.log('❌ Admin scrape cover endpoint failed:', scrapeResponse.status, errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testEndpoints();

