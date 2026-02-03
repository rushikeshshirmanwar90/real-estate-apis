/**
 * Property-Based Test for Notification Service Error Handling
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**
 * **Property 3: Comprehensive Error Logging**
 * 
 * For any failure in the notification flow (recipient resolution, token validation, 
 * Expo API errors, or performance issues), the system should log structured error 
 * information with relevant context (user ID, activity ID, client ID, project ID, 
 * error codes) that can be easily searched and filtered.
 */

// Import the notification service - handle TypeScript module
let notifyMaterialActivityCreated;

async function loadNotificationService() {
  try {
    // Try dynamic import for TypeScript module
    const module = await import('./lib/services/notificationService.js');
    notifyMaterialActivityCreated = module.notifyMaterialActivityCreated;
  } catch (error) {
    console.error('Failed to load notification service:', error.message);
    console.log('Attempting alternative import method...');
    
    // Fallback: try to require the compiled version
    try {
      const compiledModule = require('./lib/services/notificationService');
      notifyMaterialActivityCreated = compiledModule.notifyMaterialActivityCreated;
    } catch (fallbackError) {
      console.error('All import methods failed:', fallbackError.message);
      throw new Error('Cannot load notification service module');
    }
  }
}

// Property-based testing configuration
const PROPERTY_TEST_ITERATIONS = 100;
const PROPERTY_TEST_TIMEOUT = 30000; // 30 seconds

// Test data generators for property-based testing
class TestDataGenerators {
  static generateRandomString(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateValidMaterialActivity() {
    return {
      _id: `activity_${this.generateRandomString(12)}`,
      user: {
        userId: `user_${this.generateRandomString(8)}`,
        fullName: `Test User ${this.generateRandomString(5)}`
      },
      clientId: `client_${this.generateRandomString(8)}`,
      projectId: `project_${this.generateRandomString(8)}`,
      projectName: `Test Project ${this.generateRandomString(5)}`,
      materials: [
        {
          name: `Material ${this.generateRandomString(6)}`,
          unit: Math.random() > 0.5 ? 'kg' : 'bags',
          qnt: Math.floor(Math.random() * 100) + 1,
          perUnitCost: Math.floor(Math.random() * 1000) + 100,
          totalCost: Math.floor(Math.random() * 10000) + 1000
        }
      ],
      activity: ['imported', 'used', 'transferred'][Math.floor(Math.random() * 3)],
      message: `Test message ${this.generateRandomString(10)}`,
      date: new Date().toISOString()
    };
  }

  static generateInvalidMaterialActivity() {
    const invalidTypes = [
      // Missing required fields
      () => ({}),
      () => ({ _id: this.generateRandomString(12) }),
      () => ({ 
        _id: this.generateRandomString(12),
        user: { fullName: 'Test User' } // Missing userId
      }),
      () => ({ 
        _id: this.generateRandomString(12),
        user: { userId: this.generateRandomString(8), fullName: 'Test User' }
        // Missing clientId, projectId
      }),
      () => ({ 
        _id: this.generateRandomString(12),
        user: { userId: this.generateRandomString(8), fullName: 'Test User' },
        clientId: this.generateRandomString(8)
        // Missing projectId
      }),
      // Invalid activity types
      () => ({
        ...this.generateValidMaterialActivity(),
        activity: 'invalid_activity_type'
      }),
      // Null/undefined values
      () => ({
        ...this.generateValidMaterialActivity(),
        user: null
      }),
      () => ({
        ...this.generateValidMaterialActivity(),
        clientId: null
      }),
      () => ({
        ...this.generateValidMaterialActivity(),
        projectId: undefined
      })
    ];

    const randomType = invalidTypes[Math.floor(Math.random() * invalidTypes.length)];
    return randomType();
  }

  static generateTransferActivity() {
    const base = this.generateValidMaterialActivity();
    return {
      ...base,
      activity: 'transferred',
      transferDetails: {
        fromProject: {
          id: `source_project_${this.generateRandomString(8)}`,
          name: `Source Project ${this.generateRandomString(5)}`
        },
        toProject: {
          id: base.projectId,
          name: base.projectName
        }
      }
    };
  }

  static generateSlowProcessingActivity() {
    // This will be used to test performance warnings
    return {
      ...this.generateValidMaterialActivity(),
      _slowProcessing: true // Flag for test to simulate slow processing
    };
  }
}

// Mock console to capture logs for verification
class LogCapture {
  constructor() {
    this.logs = [];
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };
  }

  start() {
    this.logs = [];
    console.log = (...args) => {
      this.logs.push({ level: 'log', args, timestamp: Date.now() });
      this.originalConsole.log(...args);
    };
    console.warn = (...args) => {
      this.logs.push({ level: 'warn', args, timestamp: Date.now() });
      this.originalConsole.warn(...args);
    };
    console.error = (...args) => {
      this.logs.push({ level: 'error', args, timestamp: Date.now() });
      this.originalConsole.error(...args);
    };
  }

  stop() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
  }

  getLogs() {
    return this.logs;
  }

  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  findLogsContaining(searchText) {
    return this.logs.filter(log => 
      log.args.some(arg => 
        typeof arg === 'string' && arg.includes(searchText)
      )
    );
  }
}

// Property test implementation
class NotificationErrorHandlingPropertyTest {
  constructor() {
    this.logCapture = new LogCapture();
    this.testResults = {
      totalIterations: 0,
      passedIterations: 0,
      failedIterations: 0,
      failures: [],
      properties: {
        structuredErrorLogging: { passed: 0, failed: 0 },
        contextualInformation: { passed: 0, failed: 0 },
        errorClassification: { passed: 0, failed: 0 },
        performanceWarnings: { passed: 0, failed: 0 },
        searchableLogging: { passed: 0, failed: 0 }
      }
    };
  }

  async runPropertyTest() {
    console.log('🧪 Starting Property-Based Test for Notification Service Error Handling');
    console.log(`📊 Running ${PROPERTY_TEST_ITERATIONS} iterations with ${PROPERTY_TEST_TIMEOUT}ms timeout`);
    console.log('**Property 3: Comprehensive Error Logging**');
    console.log('**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**\n');

    const startTime = Date.now();

    for (let i = 0; i < PROPERTY_TEST_ITERATIONS; i++) {
      this.testResults.totalIterations++;
      
      try {
        await this.runSingleIteration(i);
        this.testResults.passedIterations++;
      } catch (error) {
        this.testResults.failedIterations++;
        this.testResults.failures.push({
          iteration: i,
          error: error.message,
          stack: error.stack
        });
        console.error(`❌ Iteration ${i} failed:`, error.message);
      }

      // Progress reporting every 20 iterations
      if ((i + 1) % 20 === 0) {
        console.log(`📈 Progress: ${i + 1}/${PROPERTY_TEST_ITERATIONS} iterations completed`);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    this.printResults(totalTime);
    return this.testResults;
  }

  async runSingleIteration(iteration) {
    // Generate test data based on iteration to cover different scenarios
    let materialActivity;
    let expectedErrorTypes = [];

    if (iteration % 10 === 0) {
      // 10% invalid activities (validation errors)
      materialActivity = TestDataGenerators.generateInvalidMaterialActivity();
      expectedErrorTypes = ['VALIDATION_ERROR'];
    } else if (iteration % 15 === 0) {
      // ~7% transfer activities (more complex flow)
      materialActivity = TestDataGenerators.generateTransferActivity();
      expectedErrorTypes = ['RECIPIENT_RESOLUTION', 'DELIVERY_FAILURE'];
    } else if (iteration % 25 === 0) {
      // 4% slow processing activities (performance warnings)
      materialActivity = TestDataGenerators.generateSlowProcessingActivity();
      expectedErrorTypes = ['RECIPIENT_RESOLUTION', 'DELIVERY_FAILURE'];
    } else {
      // ~79% valid activities (normal flow with potential delivery failures)
      materialActivity = TestDataGenerators.generateValidMaterialActivity();
      expectedErrorTypes = ['RECIPIENT_RESOLUTION', 'DELIVERY_FAILURE'];
    }

    // Capture logs for this iteration
    this.logCapture.start();
    
    let result;
    const iterationStartTime = Date.now();
    
    try {
      // Add timeout to prevent hanging
      result = await Promise.race([
        notifyMaterialActivityCreated(materialActivity),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), PROPERTY_TEST_TIMEOUT)
        )
      ]);
    } finally {
      this.logCapture.stop();
    }

    const iterationEndTime = Date.now();
    const processingTime = iterationEndTime - iterationStartTime;

    // Verify properties
    await this.verifyProperties(materialActivity, result, processingTime, iteration);
  }

  async verifyProperties(materialActivity, result, processingTime, iteration) {
    const logs = this.logCapture.getLogs();

    // Property 1: Structured Error Logging (Requirement 2.1, 2.5)
    this.verifyStructuredErrorLogging(result, logs, iteration);

    // Property 2: Contextual Information (Requirements 2.1, 2.3)
    this.verifyContextualInformation(materialActivity, result, logs, iteration);

    // Property 3: Error Classification (Requirements 2.2, 2.4)
    this.verifyErrorClassification(result, logs, iteration);

    // Property 4: Performance Warnings (Requirement 2.6)
    this.verifyPerformanceWarnings(processingTime, logs, iteration);

    // Property 5: Searchable Logging (Requirement 2.5)
    this.verifySearchableLogging(materialActivity, logs, iteration);
  }

  verifyStructuredErrorLogging(result, logs, iteration) {
    try {
      // Verify that result contains structured error information
      if (!result) {
        throw new Error('Result is null or undefined');
      }

      if (typeof result !== 'object') {
        throw new Error('Result is not an object');
      }

      // Check required fields in result
      const requiredFields = ['success', 'notificationId', 'recipientCount', 'deliveredCount', 'failedCount', 'errors', 'processingTimeMs'];
      for (const field of requiredFields) {
        if (!(field in result)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Verify error structure if errors exist
      if (result.errors && result.errors.length > 0) {
        for (const error of result.errors) {
          const requiredErrorFields = ['type', 'message', 'context', 'retryable', 'timestamp'];
          for (const field of requiredErrorFields) {
            if (!(field in error)) {
              throw new Error(`Error missing required field: ${field}`);
            }
          }

          // Verify error type is valid
          const validErrorTypes = ['RECIPIENT_RESOLUTION', 'TOKEN_VALIDATION', 'DELIVERY_FAILURE', 'TIMEOUT', 'VALIDATION_ERROR', 'API_ERROR'];
          if (!validErrorTypes.includes(error.type)) {
            throw new Error(`Invalid error type: ${error.type}`);
          }
        }
      }

      this.testResults.properties.structuredErrorLogging.passed++;
    } catch (error) {
      this.testResults.properties.structuredErrorLogging.failed++;
      throw new Error(`Structured error logging failed: ${error.message}`);
    }
  }

  verifyContextualInformation(materialActivity, result, logs, iteration) {
    try {
      // Verify that logs contain contextual information
      const contextLogs = logs.filter(log => 
        log.args.some(arg => 
          typeof arg === 'string' && (
            arg.includes('Activity:') || 
            arg.includes('User:') || 
            arg.includes('Client:') || 
            arg.includes('Project:')
          )
        )
      );

      if (contextLogs.length === 0) {
        throw new Error('No contextual logging found');
      }

      // Verify that error context contains relevant information
      if (result.errors && result.errors.length > 0) {
        for (const error of result.errors) {
          if (!error.context || typeof error.context !== 'object') {
            throw new Error('Error context is missing or invalid');
          }

          // Check for relevant context based on error type
          if (error.type === 'RECIPIENT_RESOLUTION') {
            if (!error.context.clientId && !error.context.projectId) {
              throw new Error('Recipient resolution error missing client/project context');
            }
          }
        }
      }

      this.testResults.properties.contextualInformation.passed++;
    } catch (error) {
      this.testResults.properties.contextualInformation.failed++;
      throw new Error(`Contextual information failed: ${error.message}`);
    }
  }

  verifyErrorClassification(result, logs, iteration) {
    try {
      // Verify that errors are properly classified
      if (result.errors && result.errors.length > 0) {
        for (const error of result.errors) {
          // Verify retryable flag is boolean
          if (typeof error.retryable !== 'boolean') {
            throw new Error('Error retryable flag is not boolean');
          }

          // Verify timestamp is valid
          if (!(error.timestamp instanceof Date) && typeof error.timestamp !== 'string') {
            throw new Error('Error timestamp is invalid');
          }

          // Verify message is descriptive
          if (!error.message || error.message.length < 10) {
            throw new Error('Error message is too short or missing');
          }
        }
      }

      this.testResults.properties.errorClassification.passed++;
    } catch (error) {
      this.testResults.properties.errorClassification.failed++;
      throw new Error(`Error classification failed: ${error.message}`);
    }
  }

  verifyPerformanceWarnings(processingTime, logs, iteration) {
    try {
      // Check if processing time exceeded 10 seconds and verify warning was logged
      if (processingTime > 10000) {
        const performanceWarnings = logs.filter(log => 
          log.level === 'warn' && 
          log.args.some(arg => 
            typeof arg === 'string' && (
              arg.includes('PERFORMANCE WARNING') || 
              arg.includes('took') && arg.includes('ms')
            )
          )
        );

        if (performanceWarnings.length === 0) {
          throw new Error('Performance warning not logged for slow processing');
        }
      }

      // Verify that processing time is tracked
      if (!result.processingTimeMs || typeof result.processingTimeMs !== 'number') {
        throw new Error('Processing time not tracked properly');
      }

      this.testResults.properties.performanceWarnings.passed++;
    } catch (error) {
      this.testResults.properties.performanceWarnings.failed++;
      throw new Error(`Performance warnings failed: ${error.message}`);
    }
  }

  verifySearchableLogging(materialActivity, logs, iteration) {
    try {
      // Verify that logs follow a searchable format
      const structuredLogs = logs.filter(log => 
        log.args.some(arg => 
          typeof arg === 'string' && (
            arg.includes('[Activity:') || 
            arg.includes('🔔') || 
            arg.includes('⚠️') || 
            arg.includes('❌')
          )
        )
      );

      if (structuredLogs.length === 0) {
        throw new Error('No structured logs found for searching');
      }

      // Verify that activity ID can be found in logs if material activity has ID
      if (materialActivity._id) {
        const activityLogs = logs.filter(log => 
          log.args.some(arg => 
            typeof arg === 'string' && arg.includes(materialActivity._id)
          )
        );

        if (activityLogs.length === 0) {
          throw new Error('Activity ID not found in logs for searchability');
        }
      }

      this.testResults.properties.searchableLogging.passed++;
    } catch (error) {
      this.testResults.properties.searchableLogging.failed++;
      throw new Error(`Searchable logging failed: ${error.message}`);
    }
  }

  printResults(totalTime) {
    console.log('\n🏁 Property-Based Test Results');
    console.log('=====================================');
    console.log(`⏱️  Total execution time: ${totalTime}ms`);
    console.log(`📊 Total iterations: ${this.testResults.totalIterations}`);
    console.log(`✅ Passed iterations: ${this.testResults.passedIterations}`);
    console.log(`❌ Failed iterations: ${this.testResults.failedIterations}`);
    console.log(`📈 Success rate: ${((this.testResults.passedIterations / this.testResults.totalIterations) * 100).toFixed(2)}%`);

    console.log('\n📋 Property Verification Results:');
    for (const [property, results] of Object.entries(this.testResults.properties)) {
      const total = results.passed + results.failed;
      const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(2) : 0;
      console.log(`   ${property}: ${results.passed}/${total} (${successRate}%)`);
    }

    if (this.testResults.failures.length > 0) {
      console.log('\n❌ Failure Details:');
      this.testResults.failures.slice(0, 5).forEach((failure, index) => {
        console.log(`   ${index + 1}. Iteration ${failure.iteration}: ${failure.error}`);
      });
      
      if (this.testResults.failures.length > 5) {
        console.log(`   ... and ${this.testResults.failures.length - 5} more failures`);
      }
    }

    // Determine overall test result
    const overallSuccess = this.testResults.failedIterations === 0;
    console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (overallSuccess) {
      console.log('🎉 All property tests passed! The notification service demonstrates comprehensive error handling.');
    } else {
      console.log('⚠️  Some property tests failed. Review the failures above for details.');
    }
  }
}

// Main execution
async function runPropertyBasedTest() {
  // Load the notification service first
  await loadNotificationService();
  
  if (!notifyMaterialActivityCreated) {
    console.error('❌ Failed to load notifyMaterialActivityCreated function');
    process.exit(1);
  }
  
  const test = new NotificationErrorHandlingPropertyTest();
  
  try {
    const results = await test.runPropertyTest();
    
    // Exit with appropriate code
    process.exit(results.failedIterations === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Property test execution failed:', error);
    process.exit(1);
  }
}

// Export for potential integration with other test frameworks
module.exports = {
  NotificationErrorHandlingPropertyTest,
  TestDataGenerators,
  LogCapture
};

// Run if called directly
if (require.main === module) {
  runPropertyBasedTest().catch(console.error);
}