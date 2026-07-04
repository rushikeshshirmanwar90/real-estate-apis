#!/usr/bin/env node

/**
 * Server Health Check Script
 * Tests MongoDB and Redis connections
 */

const mongoose = require('mongoose');
const Redis = require('ioredis');
require('dotenv').config();

async function checkMongoDB() {
  console.log('🔍 Testing MongoDB connection...');
  
  try {
    await mongoose.connect(process.env.DB_URL, {
      dbName: "realEstate",
      bufferCommands: false,
      bufferMaxEntries: 0,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 15000,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ MongoDB connection successful');
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ MongoDB has ${collections.length} collections`);
    
    await mongoose.connection.close();
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function checkRedis() {
  console.log('🔍 Testing Redis connection...');
  
  if (process.env.REDIS_ENABLED !== 'true') {
    console.log('ℹ️ Redis is disabled in environment');
    return true;
  }
  
  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    connectTimeout: 5000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  
  try {
    await client.connect();
    await client.ping();
    console.log('✅ Redis connection successful');
    
    // Test set/get
    await client.set('health-check', 'ok', 'EX', 10);
    const result = await client.get('health-check');
    console.log(`✅ Redis read/write test: ${result}`);
    
    await client.disconnect();
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🏥 Starting server health check...\n');
  
  const mongoOk = await checkMongoDB();
  console.log('');
  
  const redisOk = await checkRedis();
  console.log('');
  
  console.log('📊 HEALTH CHECK SUMMARY:');
  console.log('='.repeat(40));
  console.log(`MongoDB: ${mongoOk ? '✅ Healthy' : '❌ Failed'}`);
  console.log(`Redis: ${redisOk ? '✅ Healthy' : '❌ Failed'}`);
  
  if (mongoOk && redisOk) {
    console.log('\n🎉 All services are healthy!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some services have issues. Check the logs above.');
    process.exit(1);
  }
}

main().catch(console.error);