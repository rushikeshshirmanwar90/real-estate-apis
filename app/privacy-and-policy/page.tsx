import React from "react";

// Save this file as `pages/privacy.tsx` (Next.js pages router)
// or adapt to `app/privacy/page.tsx` for the app router.

const CONTACT_EMAIL = "growwithexponentor@gmail.com";

export default function PrivacyPolicy(): JSX.Element {
  return (
    <main className="min-h-screen bg-[#f8fafc] py-12 px-6 md:px-16 lg:px-32">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-12">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a]">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-600">Last Updated: 1 December 2025 · Xsite</p>
        </header>

        <section className="space-y-6 text-gray-800 leading-relaxed">
          <p>
            Your privacy is important to us. This Privacy Policy explains how <strong>Xsite</strong> collects, uses,
            and protects your information when you use our mobile application. By using the Xsite app, you agree to
            the practices described in this policy.
          </p>

          <h2 className="text-xl font-semibold">1. Information We Collect</h2>
          <p>
            We collect the following personal information when you register or use our services:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Personal Information:</strong> Email address, Phone number.</li>
            <li><strong>Non-Personal Information:</strong> We do not collect analytics, device information, or usage data unless explicitly required in future updates (users will be informed beforehand).</li>
          </ul>

          <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
          <p>
            Xsite uses your information only for the following purposes:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>To register and verify your account.</li>
            <li>To communicate important updates regarding your site or app usage.</li>
            <li>To provide customer support.</li>
            <li>To ensure security and prevent unauthorized access.</li>
          </ul>
          <p className="text-sm text-gray-600">We do not sell, share, or rent your personal information to any third party.</p>

          <h2 className="text-xl font-semibold">3. Third-Party Services</h2>
          <p>Xsite does not use any third-party services such as analytics, advertising platforms, or payment gateways. No user data is shared with external services.</p>

          <h2 className="text-xl font-semibold">4. Advertisements</h2>
          <p>The Xsite app does not display any advertisements. Your experience is completely ad-free.</p>

          <h2 className="text-xl font-semibold">5. Data Storage &amp; Security</h2>
          <p>
            We take all reasonable steps to protect your data from unauthorized access, loss, misuse, and modification.
            Any stored data is maintained in a secure environment. However, no method of electronic transmission or storage
            is 100% secure.
          </p>

          <h2 className="text-xl font-semibold">6. Account Deletion</h2>
          <p>
            Users can request account deletion at any time by contacting us at:
            <br />
            <a className="text-blue-600 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
          <p className="mt-2">
            Upon deletion: your account will be permanently removed and all associated personal data (email and phone number) will be deleted. This process is irreversible.
          </p>

          <h2 className="text-xl font-semibold">7. Children&apos;s Privacy</h2>
          <p>Xsite is not intended for children under the age of 13. We do not knowingly collect information from children.</p>

          <h2 className="text-xl font-semibold">8. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the &quot;Last Updated&quot; date and notify users within the app if changes are significant.
          </p>

          <h2 className="text-xl font-semibold">9. Contact Us</h2>
          <p>
            If you have any questions or concerns regarding this Privacy Policy, you may contact us at: <br />
            <a className="text-blue-600 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </section>

        <footer className="mt-10 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Xsite. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
