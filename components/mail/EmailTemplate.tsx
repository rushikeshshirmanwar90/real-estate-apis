// components/EmailTemplate.tsx
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
} from '@react-email/components';
import * as React from 'react';

interface AWSVerifyEmailProps {
    verificationCode?: string | number;
}

const baseUrl = 'https://res.cloudinary.com/dlcq8i2sc/image/upload/v1741694804/wbw6tqlr9qakfbts0kic.png';

export const EmailTemplate = ({
    verificationCode,
}: AWSVerifyEmailProps) => {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Preview>Email Verification</Preview>
                <Container style={container}>
                    <Section style={coverSection}>
                        <Section style={imageSection}>
                            <Img
                                src={`${baseUrl}`}
                                width="600"
                                height="auto"
                                alt="Logo"
                            />
                        </Section>
                        <Section style={upperSection}>
                            <Heading style={h1}>Verify your email address</Heading>
                            <Text style={mainText}>
                                Thank you for registering with [Your Real Estate App Name]! To complete your registration,
                                please verify your email address by entering the verification code below:
                            </Text>
                            <Section style={verificationSection}>
                                <Text style={verifyText}>Verification code</Text>
                                <Text style={codeText}>{verificationCode}</Text>
                                <Text style={validityText}>
                                    (This code is valid for 10 minutes)
                                </Text>
                            </Section>
                        </Section>
                        <Hr />
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: '#fff',
    color: '#212121',
};

const container = {
    padding: '20px',
    margin: '0 auto',
    backgroundColor: '#eee',
};

const h1 = {
    color: '#333',
    fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '15px',
};

const text = {
    color: '#333',
    fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    fontSize: '14px',
    margin: '24px 0',
};

const imageSection = {
    backgroundColor: '#D9D9D9',
    display: 'flex',
    padding: '20px 0',
    alignItems: 'center',
    justifyContent: 'center',
};

const verifyText = {
    ...text,
    margin: 0,
    fontWeight: 'bold',
    textAlign: 'center' as const,
};

const codeText = {
    ...text,
    fontWeight: 'bold',
    fontSize: '36px',
    margin: '10px 0',
    textAlign: 'center' as const,
};

const validityText = {
    ...text,
    margin: '0px',
    textAlign: 'center' as const,
};

const verificationSection = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const mainText = { ...text, marginBottom: '14px' };

const coverSection = { backgroundColor: '#fff' };

const upperSection = { padding: '25px 35px' };