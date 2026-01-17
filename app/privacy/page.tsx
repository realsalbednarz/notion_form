export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 2025</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
            <p className="text-gray-600">
              Notion Form Builder ("we", "our", or "us") respects your privacy. This policy explains how we collect, use, and protect your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
            <p className="text-gray-600 mb-2">When you use our service, we may collect:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Your Notion account information (name, email, avatar) provided through Notion OAuth</li>
              <li>Access tokens to interact with your Notion workspace on your behalf</li>
              <li>Information about the Notion databases you choose to connect</li>
              <li>Form submissions data that passes through our service to Notion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Your Information</h2>
            <p className="text-gray-600 mb-2">We use your information to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Authenticate you with our service</li>
              <li>Display your Notion databases and create forms</li>
              <li>Submit form responses to your Notion databases</li>
              <li>Improve and maintain our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Storage</h2>
            <p className="text-gray-600">
              We store your authentication tokens securely to maintain your session. Form submission data is passed directly to Notion and is not permanently stored on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Third-Party Services</h2>
            <p className="text-gray-600">
              Our service integrates with Notion. Your use of Notion is subject to Notion's own privacy policy and terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
            <p className="text-gray-600 mb-2">You can:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Disconnect our app from your Notion workspace at any time</li>
              <li>Request deletion of your data by contacting us</li>
              <li>Revoke access through your Notion account settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
            <p className="text-gray-600">
              If you have questions about this privacy policy, please open an issue on our GitHub repository.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
