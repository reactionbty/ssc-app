'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setLoading(true);
    setErrorMessage('');

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border p-6 sm:p-8">

        <div className="text-center mb-7">

          <h1 className="text-2xl font-extrabold text-gray-800">
            Sign In
          </h1>

          <p className="text-sm text-gray-500 mt-2">
            Sign in to continue to your tests
          </p>

        </div>

        {errorMessage && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className="space-y-4"
        >

          <div>

            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              placeholder="you@example.com"
              className="w-full border rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <div>

            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              placeholder="••••••••"
              className="w-full border rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => router.push('/signup')}
            className="text-blue-600 font-semibold hover:underline"
          >
            Create one
          </button>
        </p>

      </div>

    </main>
  );
}