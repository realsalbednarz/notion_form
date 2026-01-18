import Link from 'next/link';
import TopNav from '@/components/TopNav';

export default function Home() {
  return (
    <main className="min-h-screen">
      <TopNav />

      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-4xl font-bold mb-4">
            Build Forms for Notion
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Create custom forms that submit directly to your Notion databases.
            No coding required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/forms/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Form
            </Link>
            <Link
              href="/forms"
              className="inline-block px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              My Forms
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
