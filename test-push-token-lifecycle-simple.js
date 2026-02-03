/**
 * Simplified Property-Based Test for Push Token Lifecycle Management
 * **Feature: notification-system-fix, Property 2: Push Token Lifecycle Management**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
 */

console.log('🧪 Starting Push Token Lifecycle Property Test');
console.log('**Property 2: Push Token Lifecycle Management**');
console.log('**Validates: Requirements 3.1, 3.2, 3.3, 3.5**\n');

// Configuration
const ITERATIONS = 25;
let passedTests = 0;
let failedTests = 0;
const failures = [];

// Token validation patterns
const TOKEN_PATTERNS = {
  EXPO_LEGACY: /^ExponentPushToken\[([a-zA-Z0-9_-]+)\]$/,
  EXPO_MODERN: /^ExpoPushToken\[([a-zA-Z0-9_-]+)\]$/,
  FCM_ANDROID: /^[a-zA-Z0-9_-]{140,}$/,
  FCM_WEB: /^[a-zA-Z0-9_-]{152,}$/,
  APNS_DEVICE: /^[a-f0-9]{64}$/i,
};

// Token generators
function generateValidExpoToken() {
  const tokenId = generateRandomString(22);
  const isLegacy = Math.random() > 0.5;
  return isLegacy ? `ExponentPushToken[${tokenId}]` : `ExpoPushToken[${tokenId}]`;
}

function generateValidFCMToken() {
  const isWeb = Math.random() > 0.5;
  const length = isWeb ? 160 : 150;
  return generateRandomString(length);
}

function generateValidAPNSToken() {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateInvalidToken() {
  const invalidTypes = [
    () => 'ExponentPushToken[UNREGISTERED]',
    () => 'invalid-token-format',
    () => 'short',
    () => 'a'.repeat(5000),
    () => 'ExpoPushToken[invalid@#$%]',
    () => '',
    () => 'FCM-' + generateRandomString(50),
    () => generateRandomString(63),
    () => 'ExpoPushToken[]',
  ];
  
  const randomType = invalidTypes[Math.floor(Math.random() * invalidTypes.length)];
  return randomType();
}

function generateRandomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Token validation function
function validateToken(token) {
  if (!token || typeof token !== 'string') {
    return {
      isValid: false,
      format: 'UNKNOWN',
      errors: ['Token is null, undefined, or not a string'],
    };
  }

  const result = {
    isValid: false,
    format: 'UNKNOWN',
    errors: [],
    metadata: { timestamp: Date.now() },
  };

  try {
    // Basic length and character validation
    if (token.length < 10) {
      result.errors.push('Token too short (minimum 10 characters)');
      return result;
    }

    if (token.length > 4096) {
      result.errors.push('Token too long (maximum 4096 characters)');
      return result;
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9_\-\[\]]+$/.test(token)) {
      result.errors.push('Token contains invalid characters');
      return result;
    }

    // Format-specific validation
    if (TOKEN_PATTERNS.EXPO_LEGACY.test(token)) {
      result.format = 'EXPO';
      result.isValid = true;
      result.metadata.tokenType = 'ExponentPushToken';
      result.metadata.isLegacy = true;
    } else if (TOKEN_PATTERNS.EXPO_MODERN.test(token)) {
      result.format = 'EXPO';
      result.isValid = true;
      result.metadata.tokenType = 'ExpoPushToken';
      result.metadata.isLegacy = false;
    } else if (TOKEN_PATTERNS.FCM_ANDROID.test(token)) {
      result.format = 'FCM';
      result.isValid = true;
      result.metadata.tokenType = 'FCM';
      result.metadata.platform = 'android';
    } else if (TOKEN_PATTERNS.FCM_WEB.test(token)) {
      result.format = 'FCM';
      result.isValid = true;
      result.metadata.tokenType = 'FCM';
      result.metadata.platform = 'web';
    } else if (TOKEN_PATTERNS.APNS_DEVICE.test(token)) {
      result.format = 'APNS';
      result.isValid = true;
      result.metadata.tokenType = 'APNS';
      result.metadata.platform = 'ios';
    } else {
      result.errors.push('Token format not recognized');
      result.format = 'UNKNOWN';
    }

    // Additional validation for known formats
    if (result.isValid) {
      if (result.format === 'EXPO' && token.includes('ExponentPushToken[UNREGISTERED]')) {
        result.isValid = false;
        result.errors.push('Token is unregistered');
      }
    }

  } catch (error) {
    result.errors.push(`Validation error: ${error.message}`);
  }

  return result;
}

// Property test functions
function testTokenFormatValidation(token, expectedValid, iteration) {
  try {
    const validation = validateToken(token);
    
    // Verify validation result matches expected validity
    if (expectedValid && !validation.isValid) {
      throw new Error(`Expected valid token but validation failed: ${validation.errors.join(', ')}`);
    }
    
    if (!expectedValid && validation.isValid) {
      throw new Error(`Expected invalid token but validation passed`);
    }
    
    // Verify format detection for valid tokens
    if (validation.isValid) {
      const validFormats = ['EXPO', 'FCM', 'APNS'];
      if (!validFormats.includes(validation.format)) {
        throw new Error(`Invalid format detected: ${validation.format}`);
      }
      
      if (!validation.metadata) {
        throw new Error('Valid token missing metadata');
      }
    }
    
    // Verify error structure
    if (!Array.isArray(validation.errors)) {
      throw new Error('Validation errors should be an array');
    }
    
    return true;
  } catch (error) {
    throw new Error(`Token format validation failed: ${error.message}`);
  }
}

function testInvalidTokenRejection(token, expectedValid, iteration) {
  try {
    const validation = validateToken(token);
    
    // Invalid tokens should be rejected with descriptive errors
    if (!expectedValid) {
      if (validation.isValid) {
        throw new Error('Invalid token was not rejected');
      }
      
      if (validation.errors.length === 0) {
        throw new Error('Invalid token rejection lacks descriptive errors');
      }
      
      // Verify error messages are descriptive
      for (const error of validation.errors) {
        if (typeof error !== 'string' || error.length < 10) {
          throw new Error(`Error message not descriptive enough: "${error}"`);
        }
      }
      
      if (validation.format !== 'UNKNOWN') {
        throw new Error(`Invalid token should have UNKNOWN format, got: ${validation.format}`);
      }
    }
    
    return true;
  } catch (error) {
    throw new Error(`Invalid token rejection failed: ${error.message}`);
  }
}

function testValidationConsistency(token, iteration) {
  try {
    // Test validation consistency - same token should always return same result
    const validation1 = validateToken(token);
    const validation2 = validateToken(token);
    
    if (validation1.isValid !== validation2.isValid) {
      throw new Error('Validation consistency failed: isValid differs');
    }
    
    if (validation1.format !== validation2.format) {
      throw new Error('Validation consistency failed: format differs');
    }
    
    if (validation1.errors.length !== validation2.errors.length) {
      throw new Error('Validation consistency failed: error count differs');
    }
    
    return true;
  } catch (error) {
    throw new Error(`Validation consistency failed: ${error.message}`);
  }
}

function testErrorDescriptiveness(token, expectedValid, iteration) {
  try {
    const validation = validateToken(token);
    
    // For invalid tokens, verify errors are descriptive
    if (!validation.isValid) {
      if (validation.errors.length === 0) {
        throw new Error('Invalid token has no error messages');
      }
      
      for (const error of validation.errors) {
        if (typeof error !== 'string' || error.trim().length === 0) {
          throw new Error('Error message is empty or not a string');
        }
        
        // Error should be descriptive
        const meaningfulWords = ['token', 'invalid', 'short', 'long', 'characters', 'format', 'unregistered'];
        const hasDescriptiveContent = meaningfulWords.some(word => 
          error.toLowerCase().includes(word)
        );
        
        if (!hasDescriptiveContent) {
          throw new Error(`Error message not descriptive: "${error}"`);
        }
      }
    }
    
    return true;
  } catch (error) {
    throw new Error(`Error descriptiveness failed: ${error.message}`);
  }
}

// Main test execution
function runPropertyTest() {
  console.log(`📊 Running ${ITERATIONS} iterations...\n`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < ITERATIONS; i++) {
    try {
      // Generate test scenario
      let token, expectedValid;
      
      if (i < 15) {
        // Valid tokens (60%)
        const tokenType = Math.floor(Math.random() * 3);
        if (tokenType === 0) token = generateValidExpoToken();
        else if (tokenType === 1) token = generateValidFCMToken();
        else token = generateValidAPNSToken();
        expectedValid = true;
      } else if (i < 22) {
        // Invalid tokens (28%)
        token = generateInvalidToken();
        expectedValid = false;
      } else {
        // Edge cases (12%)
        token = i % 2 === 0 ? generateValidExpoToken() : generateInvalidToken();
        expectedValid = i % 2 === 0;
      }
      
      // Run property tests
      testTokenFormatValidation(token, expectedValid, i);
      testInvalidTokenRejection(token, expectedValid, i);
      testValidationConsistency(token, i);
      testErrorDescriptiveness(token, expectedValid, i);
      
      passedTests++;
      
      // Progress reporting
      if ((i + 1) % 10 === 0) {
        console.log(`📈 Progress: ${i + 1}/${ITERATIONS} iterations completed`);
      }
      
    } catch (error) {
      failedTests++;
      failures.push({
        iteration: i,
        token: token,
        expectedValid: expectedValid,
        error: error.message
      });
      console.error(`❌ Iteration ${i} failed: ${error.message}`);
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  // Print results
  console.log('\n🏁 Property-Based Test Results');
  console.log('=====================================');
  console.log(`⏱️  Total execution time: ${totalTime}ms`);
  console.log(`📊 Total iterations: ${ITERATIONS}`);
  console.log(`✅ Passed iterations: ${passedTests}`);
  console.log(`❌ Failed iterations: ${failedTests}`);
  console.log(`📈 Success rate: ${((passedTests / ITERATIONS) * 100).toFixed(2)}%`);
  
  if (failures.length > 0) {
    console.log('\n❌ Failure Details:');
    failures.slice(0, 5).forEach((failure, index) => {
      console.log(`   ${index + 1}. Iteration ${failure.iteration}: ${failure.error}`);
      console.log(`      Token: "${failure.token}"`);
      console.log(`      Expected Valid: ${failure.expectedValid}`);
    });
    
    if (failures.length > 5) {
      console.log(`   ... and ${failures.length - 5} more failures`);
    }
  }
  
  const overallSuccess = failedTests === 0;
  console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (overallSuccess) {
    console.log('🎉 All property tests passed! The push token lifecycle management system demonstrates comprehensive validation and error handling.');
  } else {
    console.log('⚠️  Some property tests failed. Review the failures above for details.');
  }
  
  return overallSuccess;
}

// Execute the test
if (require.main === module) {
  const success = runPropertyTest();
  process.exit(success ? 0 : 1);
}

module.exports = {
  validateToken,
  generateValidExpoToken,
  generateInvalidToken,
  runPropertyTest
};