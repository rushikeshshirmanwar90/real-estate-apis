#!/usr/bin/env node

/**
 * Test script to verify bearer token authentication
 * Run this after starting the backend server
 */

const https = require('https');
const http = require('http');

const BEARER_TOKEN = 'eyJhbGciOiJIUIsInRbaDas2344rr308ohagn0wer4XVCJ9.';
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const CLIENT_ID = '69db423932f75fa039cfb76f';

console.log('🧪 Bearer Token Authentication Test');
console.log('=====================================\n');
console.log(`📍 Testing against: ${BASE_URL}`);
console.log(`🔑 Bearer Token: ${BEARER_TOKEN.substring(0, 20)}...`);
console.log(`👤 Client ID: ${CLIENT_ID}\n`);

// Test 1: GET /api/clients with bearer token
function testWithToken() {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/api/clients?id=${CLIENT_ID}&skipCache=true`;
    const protocol = BASE_URL.startsWith('https') ? https : http;
    
    console.log('Test 1: GET /api/clients WITH bearer token');
    console.log(`URL: ${url}`);
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = protocol.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log('✅ SUCCESS: Bearer token authentication working!\n');
          try {
            const json = JSON.parse(data);
            console.log('Response:', JSON.stringify(json, null, 2).substring(0, 200) + '...\n');
          } catch (e) {
            console.log('Response:', data.substring(0, 200) + '...\n');
          }
          resolve(true);
        } else {
          console.log('❌ FAILED: Expected 200, got', res.statusCode);
          console.log('Response:', data.substring(0, 500) + '\n');
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ ERROR:', error.message);
      console.log('Make sure the backend server is running!\n');
      resolve(false);
    });
    
    req.end();
  });
}

// Test 2: GET /api/clients without bearer token
function testWithoutToken() {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/api/clients?id=${CLIENT_ID}`;
    const protocol = BASE_URL.startsWith('https') ? https : http;
    
    console.log('Test 2: GET /api/clients WITHOUT bearer token');
    console.log(`URL: ${url}`);
    
    const req = protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        
        if (res.statusCode === 401) {
          console.log('✅ SUCCESS: Correctly rejected unauthorized request!\n');
          try {
            const json = JSON.parse(data);
            console.log('Response:', JSON.stringify(json, null, 2) + '\n');
          } catch (e) {
            console.log('Response:', data + '\n');
          }
          resolve(true);
        } else {
          console.log('❌ FAILED: Expected 401, got', res.statusCode);
          console.log('Response:', data.substring(0, 500) + '\n');
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ ERROR:', error.message);
      console.log('Make sure the backend server is running!\n');
      resolve(false);
    });
    
    req.end();
  });
}

// Run tests
async function runTests() {
  const test1 = await testWithToken();
  const test2 = await testWithoutToken();
  
  console.log('=====================================');
  console.log('📊 Test Results:');
  console.log(`  Test 1 (With Token): ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Test 2 (Without Token): ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('=====================================\n');
  
  if (test1 && test2) {
    console.log('🎉 All tests passed! Bearer token authentication is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the backend server and configuration.');
    process.exit(1);
  }
}

runTests();
