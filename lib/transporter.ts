import nodemailer from "nodemailer";

// Create transporter with multiple fallback configurations
const createEmailTransporter = () => {
  // Primary configuration with SSL certificate handling
  const primaryConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // TLS configuration to handle self-signed certificate issues
    tls: {
      // Don't fail on invalid/self-signed certificates
      rejectUnauthorized: false,
      // Allow insecure connections for development
      ciphers: 'SSLv3',
      // Ignore certificate errors
      checkServerIdentity: () => undefined,
    },
    // Connection timeout settings
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    // Ignore TLS errors
    ignoreTLS: false,
    requireTLS: false,
  };

  console.log('📧 Creating email transporter with config:', {
    host: primaryConfig.host,
    port: primaryConfig.port,
    user: primaryConfig.auth.user,
    secure: primaryConfig.secure,
  });

  return nodemailer.createTransport(primaryConfig);
};

// Export the transporter
export const transporter = createEmailTransporter();
