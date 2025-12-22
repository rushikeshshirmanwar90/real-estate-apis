import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface OTPEmailProps {
  staffName: string;
  companyName: string;
  otp: string;
}

const baseUrl =
  "https://res.cloudinary.com/dlcq8i2sc/image/upload/v1741694804/wbw6tqlr9qakfbts0kic.png";

export const OTPTemplate = ({ staffName, companyName, otp }: OTPEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Preview>Email Verification - {companyName}</Preview>
        <Container style={container}>
          <Section style={coverSection}>
            <Section style={imageSection}>
              <Img src={`${baseUrl}`} width="600" height="auto" alt="Logo" />
            </Section>
            <Section style={upperSection}>
              <Heading style={h1}>Email Verification</Heading>
              <Text style={mainText}>
                Hello {staffName},
              </Text>
              <Text style={mainText}>
                Please verify your email address to complete your registration with {companyName}.
              </Text>
              <Section style={otpSection}>
                <Text style={otpLabel}>Your verification code is:</Text>
                <Text style={otpCode}>{otp}</Text>
                <Text style={otpNote}>
                  This code will expire in 10 minutes. Please do not share this code with anyone.
                </Text>
              </Section>
              <Text style={footerText}>
                If you didn't request this verification, please ignore this email.
              </Text>
            </Section>
            <Hr style={hrStyle} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#fff",
  color: "#212121",
};

const container = {
  padding: "20px",
  margin: "0 auto",
  backgroundColor: "#eee",
};

const h1 = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "24px",
  fontWeight: "bold",
  marginBottom: "15px",
  textAlign: "center" as const,
};

const mainText = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "16px",
  margin: "24px 0",
  lineHeight: "1.5",
};

const imageSection = {
  backgroundColor: "#D9D9D9",
  display: "flex",
  padding: "20px 0",
  alignItems: "center",
  justifyContent: "center",
};

const otpSection = {
  backgroundColor: "#f8f9fa",
  borderRadius: "8px",
  padding: "30px",
  margin: "30px 0",
  textAlign: "center" as const,
  border: "2px solid #e9ecef",
};

const otpLabel = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "16px",
  margin: "0 0 15px 0",
  fontWeight: "500",
};

const otpCode = {
  color: "#007bff",
  fontFamily: "monospace",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "15px 0",
  padding: "15px 25px",
  backgroundColor: "#ffffff",
  borderRadius: "6px",
  border: "2px solid #007bff",
  letterSpacing: "4px",
  display: "inline-block",
};

const otpNote = {
  color: "#666",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  margin: "15px 0 0 0",
  fontStyle: "italic",
};

const footerText = {
  color: "#666",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  margin: "30px 0 0 0",
  textAlign: "center" as const,
};

const coverSection = { backgroundColor: "#fff" };

const upperSection = { padding: "25px 35px" };

const hrStyle = {
  border: "none",
  height: "1px",
  backgroundColor: "#eee",
  margin: "20px 0",
};