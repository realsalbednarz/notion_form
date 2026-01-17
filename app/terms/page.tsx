export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Use</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 2025</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Acceptance of Terms</h2>
            <p className="text-gray-600">
              By accessing or using Notion Form Builder ("the Service"), you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Description of Service</h2>
            <p className="text-gray-600">
              Notion Form Builder is a tool that allows you to create web forms from your Notion databases. The Service integrates with Notion via their official API to read your database schemas and submit form responses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">User Responsibilities</h2>
            <p className="text-gray-600 mb-2">You agree to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Provide accurate information when using the Service</li>
              <li>Maintain the security of your Notion account credentials</li>
              <li>Use the Service in compliance with all applicable laws</li>
              <li>Not use the Service for any unlawful or prohibited purpose</li>
              <li>Not attempt to interfere with or disrupt the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Notion Integration</h2>
            <p className="text-gray-600">
              The Service requires access to your Notion workspace. By connecting your Notion account, you authorize us to access your databases and submit data on your behalf. You can revoke this access at any time through your Notion account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Intellectual Property</h2>
            <p className="text-gray-600">
              The Service and its original content, features, and functionality are owned by us and are protected by applicable intellectual property laws. Your data and Notion content remain your property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Disclaimer of Warranties</h2>
            <p className="text-gray-600">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Limitation of Liability</h2>
            <p className="text-gray-600">
              To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Changes to Terms</h2>
            <p className="text-gray-600">
              We reserve the right to modify these terms at any time. We will notify users of any material changes by updating the "Last updated" date. Continued use of the Service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Termination</h2>
            <p className="text-gray-600">
              We may terminate or suspend your access to the Service at any time, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
            <p className="text-gray-600">
              If you have questions about these Terms, please open an issue on our GitHub repository.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
