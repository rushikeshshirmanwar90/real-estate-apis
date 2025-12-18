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

interface Details {
    userName: string;
    flatName: string;
    title: string;
    description: string;
    images: string[];
    totalArea: number;
    video: string;
}

interface AWSVerifyEmailProps {
    details?: Details;
}

const apkLink = 'https://expo.dev/accounts/rushi_shrimanwar/projects/real-estate-app/builds/6e9ca91f-93e0-4e4e-b04a-22ad49d6af27';

const baseUrl = 'https://res.cloudinary.com/dlcq8i2sc/image/upload/v1741694804/wbw6tqlr9qakfbts0kic.png';

export const EmailTemplate = ({
    details,
}: AWSVerifyEmailProps) => {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Preview>Welcome To SHIVAI construction</Preview>
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
                            <Heading style={h1}>Welcome {details?.userName}</Heading>
                            <Text style={mainText}>
                                Thank you for showing trust to Shivai construction!
                            </Text>
                            <Section style={verificationSection}>
                                <Text style={verifyText}>your registration has done successfully</Text>
                            </Section>
                        </Section>
                        <Hr style={hrStyle} />

                        {/* Property Details Section */}
                        <Section style={propertySection}>
                            <Heading style={propertyTitle}>Property Details</Heading>


                            {/* Property Image */}
                            <Section style={propertyImageSection}>
                                <Img
                                    src={details?.images[0]}
                                    width="400"
                                    height="auto"
                                    alt="Property"
                                />
                            </Section>

                            {/* Property Name */}
                            <Text style={propertyNameText}>
                                Flat: {details?.flatName}
                            </Text>

                            {/* Property Title */}
                            <Text style={propertyTitleText}>
                                {details?.title}
                            </Text>

                            {/* Property Description */}
                            <Text style={propertyDescriptionText}>
                                {details?.description}
                            </Text>



                            {/* Property Video */}
                            <Section style={propertyVideoSection}>
                                <a
                                    href={details?.video}
                                    style={videoLinkStyle}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    View Property Video
                                </a>
                            </Section>

                            <Section style={downloadAppSection}>
                                <Text style={downloadAppText}>
                                    Download our app to get the latest updates and manage your property details
                                </Text>
                                <Section style={downloadButtonContainer}>
                                    <a
                                        href={apkLink}
                                        style={downloadButtonStyle}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Download App
                                    </a>
                                </Section>
                            </Section>

                            {/* Property Specifications */}
                            <Section style={propertySpecsSection}>
                                <Text style={specTitleText}>Property Specifications</Text>
                                <Text style={specText}>
                                    Total Area: {details?.totalArea} sq ft
                                </Text>
                            </Section>
                        </Section>


                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// Existing styles remain the same
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


const verificationSection = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const mainText = { ...text, marginBottom: '14px' };

const coverSection = { backgroundColor: '#fff' };

const upperSection = { padding: '25px 35px' };

// New styles for property details
const hrStyle = {
    border: 'none',
    height: '1px',
    backgroundColor: '#eee',
    margin: '20px 0',
};

const propertySection = {
    padding: '25px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const propertyTitle = {
    ...h1,
    fontSize: '18px',
    marginBottom: '20px',
};

const propertyNameText = {
    ...text,
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
};

const propertyTitleText = {
    ...text,
    fontSize: '16px',
    marginBottom: '15px',
};

const propertyDescriptionText = {
    ...text,
    marginBottom: '20px',
    lineHeight: '1.6',
};

const propertyImageSection = {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
};

const propertyVideoSection = {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
};

const videoLinkStyle = {
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: 'bold',
    padding: '10px 20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    display: 'inline-block',
};

const propertySpecsSection = {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
};

const specTitleText = {
    ...text,
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
};

const specText = {
    ...text,
    fontSize: '14px',
};

// New styles for download app section
const downloadAppSection = {
    marginTop: '30px',
    padding: '25px',
    backgroundColor: '#f0f8ff',
    borderRadius: '8px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const downloadAppText = {
    ...text,
    fontSize: '16px',
    margin: '0 0 20px 0',
    textAlign: 'center' as const,
};

const downloadButtonContainer = {
    display: 'flex',
    justifyContent: 'center',
    padding: '10px 0',
};

const downloadButtonStyle = {
    backgroundColor: '#007bff',
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: 'bold',
    padding: '12px 24px',
    borderRadius: '4px',
    display: 'inline-block',
    fontSize: '16px',
};