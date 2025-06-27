#!/usr/bin/env node

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function quickTest() {
  console.log('Quick filter test...\n');
  
  // Simple test
  try {
    const response = await fetch(`${API_BASE_URL}/api/grants?limit=1`);
    if (!response.ok) {
      console.error('Backend is not responding correctly:', response.status);
      console.log('\nPlease ensure the backend is running:');
      console.log('cd backend && npm run dev');
      return;
    }
    
    console.log('✓ Backend is running\n');
    
    // Test a combination
    const params = new URLSearchParams({
      funding_min: '50000',
      funding_max: '500000',
      status: 'active',
      limit: '5'
    });
    
    const comboResponse = await fetch(`${API_BASE_URL}/api/grants?${params}`);
    const data = await comboResponse.json();
    
    if (comboResponse.ok) {
      console.log('✓ Filter combination test passed');
      console.log(`Found ${data.grants?.length || 0} grants`);
    } else {
      console.error('✗ Filter test failed:', data.error);
    }
    
  } catch (error) {
    console.error('Cannot connect to backend:', error.message);
    console.log('\nPlease start the backend server:');
    console.log('cd backend && npm run dev');
  }
}

quickTest();