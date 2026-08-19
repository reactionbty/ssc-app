'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Attempt = {
  id: string;
  test_id: string;
  score: number;
  correct: number;
  wrong: number;
  unattempted: number;
  submitted_at: string;
  tests: {
    title: string;
    duration_minutes: number;
  } | null;
};

export default function HistoryPage() {
  const router = useRouter();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('test_attempts')
        .select(`
          id,
          test_id,
          score,
          correct,
          wrong,
          unattempted,
          submitted_at,
          tests (
            title,
            duration_minutes
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'submitted')
        .order('submitted_at', {
          ascending: false,
        });

      if (error) {
        console.error('History error:', error);
        setAttempts([]);
      } else {
        setAttempts((data as unknown as Attempt[]) || []);
      }

      setLoading(false);
    }

    loadHistory();
  }, [router]);

  const getAccuracy = (attempt: Attempt) => {
    const attempted =
      attempt.correct + attempt.wrong;

    if (attempted === 0) return 0;

    return Math.round(
      (attempt.correct / attempted) * 100
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />

          <p className="font-semibold text-gray-700">
            Loading History...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">

      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">

          <div>
            <h1 className="text-xl font-extrabold text-gray-800">
              Test History
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Your completed tests
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm"
          >
            Back to Tests
          </button>

        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6">

        {attempts.length === 0 ? (
          <div className="bg-white border rounded-2xl p-8 text-center">
            <p className="text-lg font-bold text-gray-700">
              No completed tests yet
            </p>

            <p className="text-sm text-gray-500 mt-2">
              Complete a mock test and it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {attempts.map((attempt) => {

              const attempted =
                attempt.correct + attempt.wrong;

              const accuracy =
                getAccuracy(attempt);

              return (
                <div
                  key={attempt.id}
                  className="bg-white border rounded-2xl p-5 shadow-sm"
                >

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                    <div>
                      <h2 className="font-bold text-gray-800">
                        {attempt.tests?.title ||
                          'SSC Test'}
                      </h2>

                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(
                          attempt.submitted_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">

                      <p className="text-3xl font-extrabold text-blue-600">
                        {attempt.score}
                      </p>

                      <p className="text-xs text-gray-500">
                        Score
                      </p>

                    </div>

                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">

                    <div className="bg-blue-50 rounded-xl p-3 text-center">

                      <p className="font-bold text-blue-600">
                        {attempted}
                      </p>

                      <p className="text-[11px] text-gray-500">
                        Attempted
                      </p>

                    </div>

                    <div className="bg-green-50 rounded-xl p-3 text-center">

                      <p className="font-bold text-green-600">
                        {attempt.correct}
                      </p>

                      <p className="text-[11px] text-gray-500">
                        Correct
                      </p>

                    </div>

                    <div className="bg-red-50 rounded-xl p-3 text-center">

                      <p className="font-bold text-red-600">
                        {attempt.wrong}
                      </p>

                      <p className="text-[11px] text-gray-500">
                        Wrong
                      </p>

                    </div>

                    <div className="bg-purple-50 rounded-xl p-3 text-center">

                      <p className="font-bold text-purple-600">
                        {accuracy}%
                      </p>

                      <p className="text-[11px] text-gray-500">
                        Accuracy
                      </p>

                    </div>

                  </div>
                   <button
            onClick={() =>
              router.push(`/history/${attempt.id}`)
            }
            className="w-full mt-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            View Result
          </button>

                </div>
              );
            })}

          </div>
        )}

      </div>

    </main>
  );
}