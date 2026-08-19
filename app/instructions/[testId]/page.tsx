'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Test = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  positive_marks: number;
  negative_marks: number;
};

export default function InstructionsPage() {
  const params = useParams();
  const router = useRouter();

  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!testId) return;

    async function loadTest() {
      const { data: testData, error: testError } =
        await supabase
          .from('tests')
          .select(
            'id, title, description, duration_minutes, positive_marks, negative_marks'
          )
          .eq('id', testId)
          .single();

      if (testError || !testData) {
        console.error(testError);
        alert('Test could not be loaded.');
        router.push('/');
        return;
      }

      const { count, error: questionError } =
        await supabase
          .from('questions')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('test_id', testId);

      if (questionError) {
        console.error(questionError);
        alert('Questions could not be loaded.');
        router.push('/');
        return;
      }

      setTest(testData);
      setQuestionCount(count || 0);
      setLoading(false);
    }

    loadTest();
  }, [testId, router]);

  if (loading || !test) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />

          <p className="font-semibold text-gray-700">
            Loading instructions...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">

          <h1 className="text-lg sm:text-xl font-bold text-gray-800">
            {test.title}
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Examination Instructions
          </p>

        </div>
      </header>

      {/* CONTENT */}

      <div className="max-w-5xl mx-auto p-4 sm:p-6">

        {/* TEST SUMMARY */}

        <section className="bg-white rounded-2xl shadow-sm border p-5 sm:p-7">

          <h2 className="text-xl font-bold text-gray-800">
            Test Overview
          </h2>

          {test.description && (
            <p className="text-gray-600 mt-2">
              {test.description}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">

            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {questionCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Questions
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {test.duration_minutes}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Minutes
              </p>
            </div>

            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                +{test.positive_marks}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Correct
              </p>
            </div>

            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                -{test.negative_marks}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Wrong
              </p>
            </div>

          </div>

        </section>

        {/* INSTRUCTIONS */}

        <section className="bg-white rounded-2xl shadow-sm border p-5 sm:p-7 mt-5">

          <h2 className="text-xl font-bold text-gray-800">
            General Instructions
          </h2>

          <ol className="mt-5 space-y-4 text-sm sm:text-base text-gray-700">

            <li className="flex gap-3">
              <span className="font-bold text-blue-600">
                1.
              </span>

              <span>
                The test contains {questionCount} questions.
              </span>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-blue-600">
                2.
              </span>

              <span>
                The total duration of the test is{' '}
                <strong>
                  {test.duration_minutes} minutes
                </strong>.
              </span>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-blue-600">
                3.
              </span>

              <span>
                Each correct answer awards{' '}
                <strong>
                  {test.positive_marks} marks
                </strong>.
              </span>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-blue-600">
                4.
              </span>

              <span>
                Each incorrect answer carries a negative
                marking of{' '}
                <strong>
                  {test.negative_marks} marks
                </strong>.
              </span>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-blue-600">
                5.
              </span>

              <span>
                You can move between questions using the
                question palette and navigation buttons.
              </span>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-blue-600">
                6.
              </span>

              <span>
                You can mark questions for review and return
                to them later.
              </span>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-blue-600">
                7.
              </span>

              <span>
                Your answers are saved during the test.
              </span>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-blue-600">
                8.
              </span>

              <span>
                The test will be automatically submitted when
                the timer reaches zero.
              </span>
            </li>

          </ol>

        </section>

        {/* SECTION INFORMATION */}

        <section className="bg-white rounded-2xl shadow-sm border p-5 sm:p-7 mt-5">

          <h2 className="text-xl font-bold text-gray-800">
            Sections
          </h2>

          <div className="grid sm:grid-cols-2 gap-3 mt-5">

            <div className="border rounded-xl p-4">
              <p className="font-bold">
                Reasoning
              </p>
              <p className="text-sm text-gray-500 mt-1">
                25 Questions
              </p>
            </div>

            <div className="border rounded-xl p-4">
              <p className="font-bold">
                General Awareness
              </p>
              <p className="text-sm text-gray-500 mt-1">
                25 Questions
              </p>
            </div>

            <div className="border rounded-xl p-4">
              <p className="font-bold">
                Quantitative Aptitude
              </p>
              <p className="text-sm text-gray-500 mt-1">
                25 Questions
              </p>
            </div>

            <div className="border rounded-xl p-4">
              <p className="font-bold">
                English
              </p>
              <p className="text-sm text-gray-500 mt-1">
                25 Questions
              </p>
            </div>

          </div>

        </section>

        {/* AGREEMENT */}

        <section className="bg-white rounded-2xl shadow-sm border p-5 sm:p-7 mt-5">

          <label className="flex gap-3 items-start cursor-pointer">

            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) =>
                setAgreed(e.target.checked)
              }
              className="mt-1 w-5 h-5 accent-blue-600"
            />

            <span className="text-sm sm:text-base text-gray-700">
              I have read and understood all the instructions
              and I am ready to start the test.
            </span>

          </label>

          <button
            disabled={!agreed}
            onClick={() =>
              router.push(`/exam/${testId}`)
            }
            className="w-full mt-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            START TEST
          </button>

        </section>

      </div>

    </main>
  );
}