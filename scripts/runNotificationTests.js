#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

// Import test classes
const NotificationSystemTester = require('./testNotificationSystem');
const NotificationAPITester = require('./testNotificationAPIs');

class TestRunner {
  constructor() {
    this.results = {
      systemTests: null,
      apiTests: null,
      overallStatus: 'pending'
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Notification System Tests\n');
    console.log('='.repeat(60));
    
    try {
      // Run system tests (database, models, services)
      console.log('📋 PHASE 1: System Component Tests');
      console.log('='.repeat(60));
      await this.runSystemTests();
      
      console.log('\n📋 PHASE 2: API Endpoint Tests');
      console.log('='.repeat(60));
      await this.runAPITests();
      
      // Generate overall report
      this.generateOverallReport();
      
    } catch (error) {
      console.error('❌ Test runner error:', error);
      this.results.overallStatus = 'error';
    }
  }

  async runSystemTests() {
    try {
      const systemTester = new NotificationSystemTester();
      await systemTester.runAllTests();
      
      this.results.systemTests = {
        passed: systemTester.testResults.passed,
        failed: systemTester.testResults.failed,
        errors: systemTester.testResults.errors,
        details: systemTester.testResults.details
      };
      
    } catch (error) {
      console.error('❌ System tests failed:', error);
      this.results.systemTests = {
        passed: 0,
        failed: 1,
        errors: [error.message],
        details: []
      };
    }
  }

  async runAPITests() {
    try {
      // Check if server is running
      const isServerRunning = await this.checkServerStatus();
      
      if (!isServerRunning) {
        console.log('⚠️ Server is not running. Starting server...');
        await this.startServer();
        
        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      const apiTester = new NotificationAPITester();
      await apiTester.runAllTests();
      
      this.results.apiTests = {
        passed: apiTester.results.passed,
        failed: apiTester.results.failed,
        tests: apiTester.results.tests
      };
      
    } catch (error) {
      console.error('❌ API tests failed:', error);
      this.results.apiTests = {
        passed: 0,
        failed: 1,
        tests: [{ testName: 'API Test Suite', passed: false, details: error.message }]
      };
    }
  }

  async checkServerStatus() {
    try {
      const axios = require('axios');
      const response = await axios.get('http://localhost:3000/api/push-notifications/stats', {
        timeout: 3000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting development server...');
      
      const serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        detached: true
      });
      
      let serverStarted = false;
      
      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Server:', output.trim());
        
        if (output.includes('Ready') || output.includes('localhost:3000') || output.includes('started')) {
          if (!serverStarted) {
            serverStarted = true;
            console.log('✅ Server started successfully');
            resolve(serverProcess);
          }
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        console.error('Server Error:', data.toString());
      });
      
      serverProcess.on('error', (error) => {
        console.error('Failed to start server:', error);
        reject(error);
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!serverStarted) {
          console.log('⚠️ Server start timeout, continuing with tests...');
          resolve(null);
        }
      }, 30000);
    });
  }

  generateOverallReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE NOTIFICATION SYSTEM TEST REPORT');
    console.log('='.repeat(80));
    
    // System Tests Summary
    if (this.results.systemTests) {
      const systemTotal = this.results.systemTests.passed + this.results.systemTests.failed;
      const systemRate = systemTotal > 0 ? ((this.results.systemTests.passed / systemTotal) * 100).toFixed(1) : 0;
      
      console.log('\n🔧 SYSTEM COMPONENT TESTS:');
      console.log(`   ✅ Passed: ${this.results.systemTests.passed}`);
      console.log(`   ❌ Failed: ${this.results.systemTests.failed}`);
      console.log(`   📈 Success Rate: ${systemRate}%`);
    }
    
    // API Tests Summary
    if (this.results.apiTests) {
      const apiTotal = this.results.apiTests.passed + this.results.apiTests.failed;
      const apiRate = apiTotal > 0 ? ((this.results.apiTests.passed / apiTotal) * 100).toFixed(1) : 0;
      
      console.log('\n🌐 API ENDPOINT TESTS:');
      console.log(`   ✅ Passed: ${this.results.apiTests.passed}`);
      console.log(`   ❌ Failed: ${this.results.apiTests.failed}`);
      console.log(`   📈 Success Rate: ${apiRate}%`);
    }
    
    // Overall Status
    const overallPassed = (this.results.systemTests?.passed || 0) + (this.results.apiTests?.passed || 0);
    const overallFailed = (this.results.systemTests?.failed || 0) + (this.results.apiTests?.failed || 0);
    const overallTotal = overallPassed + overallFailed;
    const overallRate = overallTotal > 0 ? ((overallPassed / overallTotal) * 100).toFixed(1) : 0;
    
    console.log('\n🎯 OVERALL SYSTEM STATUS:');
    console.log(`   📊 Total Tests: ${overallTotal}`);
    console.log(`   ✅ Total Passed: ${overallPassed}`);
    console.log(`   ❌ Total Failed: ${overallFailed}`);
    console.log(`   📈 Overall Success Rate: ${overallRate}%`);
    
    // Status determination
    let status, statusIcon, recommendations;
    
    if (overallRate >= 95) {
      status = 'EXCELLENT';
      statusIcon = '🟢';
      recommendations = [
        '✅ System is production-ready',
        '✅ Deploy with confidence',
        '✅ Monitor notification delivery rates in production'
      ];
    } else if (overallRate >= 85) {
      status = 'GOOD';
      statusIcon = '🟡';
      recommendations = [
        '⚠️ System is mostly ready with minor issues',
        '🔧 Fix remaining issues before production deployment',
        '📊 Monitor closely during initial deployment'
      ];
    } else if (overallRate >= 70) {
      status = 'WARNING';
      statusIcon = '🟠';
      recommendations = [
        '⚠️ System has significant issues',
        '🔧 Address failed tests before deployment',
        '🧪 Run additional testing after fixes'
      ];
    } else {
      status = 'CRITICAL';
      statusIcon = '🔴';
      recommendations = [
        '🚨 System has critical issues',
        '🛑 DO NOT deploy to production',
        '🔧 Fix all major issues and re-run tests'
      ];
    }
    
    console.log(`\n${statusIcon} SYSTEM STATUS: ${status}`);
    
    console.log('\n📋 RECOMMENDATIONS:');
    recommendations.forEach(rec => console.log(`   ${rec}`));
    
    // Error Summary
    const allErrors = [
      ...(this.results.systemTests?.errors || []),
      ...(this.results.apiTests?.tests?.filter(t => !t.passed).map(t => `API: ${t.details}`) || [])
    ];
    
    if (allErrors.length > 0) {
      console.log('\n❌ ISSUES TO ADDRESS:');
      allErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n📞 NEXT STEPS:');
    if (overallRate >= 95) {
      console.log('   1. 🚀 Deploy to staging environment');
      console.log('   2. 📱 Test with real devices and push tokens');
      console.log('   3. 📊 Set up monitoring and alerting');
      console.log('   4. 🎯 Deploy to production');
    } else {
      console.log('   1. 🔧 Fix the failed tests listed above');
      console.log('   2. 🧪 Re-run the test suite');
      console.log('   3. 📚 Check the setup guide for troubleshooting');
      console.log('   4. 🔄 Repeat until success rate is above 95%');
    }
    
    console.log('\n📚 DOCUMENTATION:');
    console.log('   📖 Setup Guide: NOTIFICATION_SETUP_GUIDE.md');
    console.log('   🧪 Test Scripts: real-estate-apis/scripts/');
    console.log('   🎛️ Admin Panel: Use NotificationTestPanel component');
    
    console.log('='.repeat(80));
    
    // Set overall status
    this.results.overallStatus = status.toLowerCase();
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const runner = new TestRunner();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Notification System Test Runner

Usage:
  node runNotificationTests.js [options]

Options:
  --help, -h     Show this help message
  --system-only  Run only system component tests
  --api-only     Run only API endpoint tests

Examples:
  node runNotificationTests.js                 # Run all tests
  node runNotificationTests.js --system-only   # Run system tests only
  node runNotificationTests.js --api-only      # Run API tests only
    `);
    process.exit(0);
  }
  
  if (args.includes('--system-only')) {
    runner.runSystemTests().then(() => {
      console.log('System tests completed');
      process.exit(0);
    });
  } else if (args.includes('--api-only')) {
    runner.runAPITests().then(() => {
      console.log('API tests completed');
      process.exit(0);
    });
  } else {
    runner.runAllTests().then(() => {
      const exitCode = runner.results.overallStatus === 'excellent' || runner.results.overallStatus === 'good' ? 0 : 1;
      process.exit(exitCode);
    });
  }
}

module.exports = TestRunner;