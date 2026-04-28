import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: "1. Information We Collect",
      content: (
        <div>
          <p className="mb-4">We may collect the following types of information:</p>
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 mb-2">a) Personal Information</h4>
            <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number (if applicable)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">b) Project & Business Data</h4>
            <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
              <li>Construction project details</li>
              <li>Cost data (labor, materials, equipment)</li>
              <li>Staff and workforce information</li>
              <li>Notes and updates entered by users</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "2. How We Use Your Information",
      content: (
        <div>
          <p className="mb-4">We use the collected information to:</p>
          <ul className="list-disc list-inside text-gray-700 ml-4 space-y-2">
            <li>Provide and maintain app functionality</li>
            <li>Manage construction projects and cost tracking</li>
            <li>Improve user experience</li>
            <li>Fix bugs and improve performance</li>
            <li>Communicate important updates</li>
          </ul>
        </div>
      )
    },
    {
      title: "3. Data Sharing",
      content: (
        <div>
          <p className="mb-4 font-semibold text-gray-800">We do not sell, trade, or rent your personal data.</p>
          <p className="mb-2">We may share data only:</p>
          <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
            <li>With trusted service providers (hosting, analytics)</li>
            <li>If required by law or legal process</li>
          </ul>
        </div>
      )
    },
    {
      title: "4. Data Security",
      content: (
        <p>We implement appropriate security measures to protect your data.</p>
      )
    },
    {
      title: "5. Data Retention",
      content: (
        <p>We retain your data only as long as necessary to provide our services or comply with legal obligations.</p>
      )
    },
    {
      title: "6. Your Rights",
      content: (
        <div>
          <p className="mb-4">You have the right to:</p>
          <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
            <li>Access your data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
          </ul>
          <p className="mt-4">
            For such requests, contact us at: 
            <a href="mailto:growwithexponentor@gmail.com" className="text-blue-600 hover:text-blue-800 font-medium ml-1">
              growwithexponentor@gmail.com
            </a>
          </p>
        </div>
      )
    },
    {
      title: "7. Third-Party Services",
      content: (
        <p>XSite may use third-party services (such as analytics or cloud storage), which may collect information in accordance with their own privacy policies.</p>
      )
    },
    {
      title: "9. Changes to This Policy",
      content: (
        <p>We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised effective date.</p>
      )
    },
    {
      title: "10. Contact Us",
      content: (
        <div>
          <p className="mb-4">If you have any questions about this Privacy Policy, please contact us:</p>
          <p>
            <strong>Email:</strong> 
            <a href="mailto:growwithexponentor@gmail.com" className="text-blue-600 hover:text-blue-800 font-medium ml-1">
              growwithexponentor@gmail.com
            </a>
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6 flex justify-between items-center">
          <Link 
            href="/xsite-marketing" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to XSite
          </Link>
          <div className="flex items-center">
            <Image 
              src="/images/xsite/logo.png" 
              alt="XSite Logo" 
              width={32} 
              height={32}
              className="mr-2"
            />
            <span className="text-xl font-bold text-blue-600">XSite</span>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy for XSite</h1>
            <p className="text-blue-100 text-lg">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Introduction */}
          <div className="px-6 py-8 border-b border-gray-200">
            <p className="text-gray-700 text-lg leading-relaxed">
              XSite ("we", "our", or "us") operates the XSite mobile application (the "App"). 
              This Privacy Policy explains how we collect, use, and protect your information when you use our application.
            </p>
          </div>

          {/* Policy Sections */}
          <div className="px-6 py-8">
            <div className="space-y-8">
              {sections.map((section, index) => (
                <div key={index} className="border-b border-gray-100 pb-6 last:border-b-0">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    {section.title}
                  </h2>
                  <div className="text-gray-700 leading-relaxed">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Agreement Statement */}
            <div className="mt-12 p-6 bg-blue-50 rounded-lg border-l-4 border-blue-600">
              <p className="text-gray-800 font-medium text-lg">
                By using XSite, you agree to this Privacy Policy.
              </p>
            </div>

            {/* Contact Section */}
            <div className="mt-8 text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Questions about this Privacy Policy?
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="mailto:growwithexponentor@gmail.com" 
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Contact Us
                </a>
                <Link 
                  href="/support" 
                  className="border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                >
                  Get Support
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <Link href="/xsite-marketing" className="hover:text-blue-600">Home</Link>
            <Link href="/support" className="hover:text-blue-600">Support</Link>
            <Link href="/login" className="hover:text-blue-600">Login</Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            © 2024 XSite. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}