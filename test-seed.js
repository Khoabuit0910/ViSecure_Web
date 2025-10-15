const axios = require('axios');

const API_BASE = 'https://web-production-4296c.up.railway.app/api';

async function seedRailwayData() {
  try {
    console.log('🔐 Attempting login...');
    
    // Try to login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'admin@visecure.com',
      password: '123456'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.token;
    
    // Call seed endpoint
    console.log('🌱 Seeding data...');
    const seedResponse = await axios.post(
      `${API_BASE}/admin/seed-data`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Seed successful:', seedResponse.data);
    
    // Test if data exists
    console.log('🔍 Testing API...');
    const testResponse = await axios.get(`${API_BASE}/public/news?limit=3`);
    console.log('📰 News count:', testResponse.data.data.news.length);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

seedRailwayData();