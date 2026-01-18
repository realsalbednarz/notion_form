'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  workspaceName: string | null;
  workspaceId: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else if (response.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  const handleConnectNotion = () => {
    window.location.href = '/login';
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Notion? You will need to reconnect to manage forms.')) {
      return;
    }

    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        {loading ? (
          <div className="bg-white rounded-lg border p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Notion Connection */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Notion Connection</h2>

              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-green-900">Connected to Notion</p>
                      <p className="text-sm text-green-700">
                        Workspace: {user.workspaceName || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-lg divide-y">
                    <div className="p-4 flex items-center gap-4">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name || 'User'}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-medium">
                          {(user.name || user.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{user.name || 'User'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-500">
                        Connected on {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDisconnect}
                    className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                  >
                    Disconnect from Notion
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Connect your Notion workspace to create and manage forms for your databases.
                  </p>
                  <button
                    onClick={handleConnectNotion}
                    className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.746 0-.933-.234-1.494-.933l-4.577-7.186v6.952l1.449.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933l3.222-.186zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.933.653.933 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.933c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.746-.793-1.306-.793-1.96V2.667c0-.84.374-1.54 1.448-1.632z" />
                    </svg>
                    Connect Notion
                  </button>
                </div>
              )}
            </div>

            {/* About Section */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">About</h2>
              <div className="text-sm text-gray-600 space-y-2">
                <p>Notion Form Builder lets you create custom forms that submit directly to your Notion databases.</p>
                <p className="text-gray-400">Version 1.0.0</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
