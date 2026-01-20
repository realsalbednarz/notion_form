'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is authenticated as admin
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          // User is logged in as admin - redirect to forms dashboard
          setIsAdmin(true);
          router.replace('/forms');
        } else {
          // Not logged in - show public landing
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
  }, [router]);

  // Show loading while checking auth
  if (checking) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </main>
    );
  }

  // Show public landing page for unauthenticated users
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Notion Form Builder
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Access forms that connect directly to Notion databases.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/directory"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Browse Forms
            </Link>
            <Link
              href="/login"
              className="inline-block px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
