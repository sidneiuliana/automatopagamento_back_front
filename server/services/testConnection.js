const { query } = require('../config/database');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await query('SELECT 1 as test');
    console.log('✅ Database connection successful:', result);
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }
}

testConnection();
