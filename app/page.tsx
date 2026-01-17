import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Notion Form Builder</h1>
        <p className="text-gray-600 mb-8">Coming soon...</p>
        <Link
          href="/databases"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Databases
        </Link>
      </div>
    </main>
  );
}