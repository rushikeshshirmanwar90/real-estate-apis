import React from 'react';
import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to XSite
          </Link>
        </div>
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">XSite Support</h1>
            <p className="text-blue-100 text-lg">
              Welcome to XSite Support.
            </p>
          </div>

          {/* Main Content */}
          <div className="px-6 py-8">
            <div className="mb-8">
              <p className="text-gray-700 text-lg leading-relaxed">
                For any issues related to project management, cost tracking, labor management, 
                equipment tracking, or account access, our support team is here to help.
              </p>
            </div>

            {/* Contact Support Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Support</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700 font-medium">Email:</span>
                  <a 
                    href="mailto:growwithexponentor@gmail.com" 
                    className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    growwithexponentor@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Support Hours Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Support Hours</h2>
              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700 font-medium">
                    Monday to Saturday: 10:00 AM – 7:00 PM IST
                  </span>
                </div>
              </div>
            </div>

            {/* Common Help Topics Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Common Help Topics</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "Login and account issues", icon: "🔐" },
                  { title: "Project creation and updates", icon: "📋" },
                  { title: "Cost graph and analytics issues", icon: "📊" },
                  { title: "Staff management support", icon: "👥" },
                  { title: "Bug reports and feedback", icon: "🐛" }
                ].map((topic, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{topic.icon}</span>
                      <span className="text-gray-700 font-medium">{topic.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Message */}
            <div className="text-center py-6 border-t border-gray-200">
              <p className="text-gray-600 font-medium">
                Thank you for using XSite.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}