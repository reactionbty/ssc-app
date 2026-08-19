'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Test = {
  id: string;
  title: string;
  duration_minutes: number;
  positive_marks: number;
  negative_marks: number;
};

export default function HomePage() {
  const router = useRouter();

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTests() {
      const { data, error } = await supabase
        .from('tests')
        .select(
          'id, title, duration_minutes, positive_marks, negative_marks'
        )
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        alert('Could not load tests: ' + error.message);
        setLoading(false);
        return;
      }

      setTests(data || []);
      setLoading(false);
    }

    loadTests();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />

          <p className="font-semibold text-gray-700">
            Loading Tests...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">

      {/* Header */}

      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-5">

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">
            SSC Mock Tests
          </h1>

          <p className="text-gray-500 mt-1">
            Practice SSC CGL with realistic mock tests
          </p>

        </div>
      </header>


      {/* Tests */}

      <section className="max-w-6xl mx-auto px-4 py-8">

        <div className="mb-6">

          <h2 className="text-xl font-bold text-gray-800">
            SSC CGL Tier 1
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Full-length mock tests
          </p>

        </div>


        {tests.length === 0 ? (

          <div className="bg-white rounded-xl p-10 text-center shadow-sm">

            <p className="text-gray-500">
              No tests available yet.
            </p>

          </div>

        ) : (

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {tests.map((test) => (

              <div
                key={test.id}
                className="bg-white rounded-xl border shadow-sm hover:shadow-md transition overflow-hidden"
              >

                <div className="p-5">

                  {/* Icon */}

                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-xl mb-4">
                    📝
                  </div>


                  {/* Title */}

                  <h3 className="font-bold text-lg text-gray-800">
                    {test.title}
                  </h3>


                  {/* Test information */}

                  <div className="grid grid-cols-2 gap-3 mt-5">

                    <div className="bg-gray-50 rounded-lg p-3">

                      <p className="text-xs text-gray-500">
                        Duration
                      </p>

                      <p className="font-bold text-gray-800">
                        {test.duration_minutes} min
                      </p>

                    </div>


                    <div className="bg-gray-50 rounded-lg p-3">

                      <p className="text-xs text-gray-500">
                        Questions
                      </p>

                      <p className="font-bold text-gray-800">
                        Mock Test
                      </p>

                    </div>

                  </div>


                  {/* Marking scheme */}

                  <div className="flex justify-between text-xs text-gray-500 mt-4">

                    <span>
                      +{test.positive_marks} Correct
                    </span>

                    <span>
                      -{test.negative_marks} Wrong
                    </span>

                  </div>


                  {/* Start button */}

                  <button
                    onClick={() => router.push(`/instructions/${test.id}`)}
                    className="w-full mt-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                  >
                    START TEST
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

    </main>
  );
}