/**
 * Environment check script to ensure all required environment variables are set
 */

function checkEnvironment() {
  const requiredEnvVars = [
    'DB_URL',
    'NEXT_PUBLIC_DOMAIN'
  ];

  const missingVars: string[] = [];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these variables in your .env file');
    return false;
  }

  console.log('✅ All required environment variables are set');
  return true;
}

export { checkEnvironment };