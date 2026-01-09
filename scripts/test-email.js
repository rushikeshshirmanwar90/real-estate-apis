// Test email configuration
require('dotenv').config();
const nodemailer = require('nodemailer');

// Disable SSL certificate verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('🔍 Testing email configuration...');
console.log('📧 SMTP Host:', process.env.SMTP_HOST);
console.log('📧 SMTP Port:', process.env.SMTP_PORT);
console.log('📧 SMTP User:', process.env.SMTP_USER);
console.log('📧 SMTP Secure:', process.env.SMTP_SECURE);

// Create transporter with SSL certificate handling
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3',
    checkServerIdentity: () => undefined,
  },
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  requireTLS: false,
});

async function testConnection() {
  try {
    console.log('🔍 Testing SMTP connection...');
    const isValid = await transporter.verify();
    
    if (isValid) {
      console.log('✅ SMTP connection is valid');
      
      // Send test email
      console.log('📧 Sending test email...');
      const info = await transporter.sendMail({
        from: `"Test Email" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER, // Send to yourself for testing
        subject: 'Test Email - SSL Certificate Fix',
        html: `
          <h2>Email Configuration Test</h2>
          <p>This email confirms that the SSL certificate issue has been resolved.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>Host: ${process.env.SMTP_HOST}</li>
            <li>Port: ${process.env.SMTP_PORT}</li>
            <li>Secure: ${process.env.SMTP_SECURE}</li>
            <li>TLS Reject Unauthorized: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED}</li>
          </ul>
        `,
      });
      
      console.log('✅ Test email sent successfully');
      console.log('📧 Message ID:', info.messageId);
      console.log('📧 Accepted:', info.accepted);
      console.log('📧 Rejected:', info.rejected);
      
    } else {
      console.error('❌ SMTP connection is invalid');
    }
  } catch (error) {
    console.error('❌ Email test failed:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    
    if (error.code === 'ESOCKET') {
      console.error('💡 ESOCKET error suggestions:');
      console.error('   1. Check internet connection');
      console.error('   2. Verify SMTP credentials');
      console.error('   3. Try using App Password for Gmail');
      console.error('   4. Check firewall/antivirus settings');
    }
  }
}

testConnection();