import Link from 'next/link';
import UserMenu from '@/components/UserMenu';

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur border-b z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold">
            Notion Form Builder
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="min-h-screen flex items-center justify-center pt-14">
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
              href="/databases"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Databases
            </Link>
            <Link
              href="/login"
              className="inline-block px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Connect Notion
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
