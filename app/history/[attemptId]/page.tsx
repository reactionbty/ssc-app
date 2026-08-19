'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AttemptResultPage() {
  const params = useParams();
  const router = useRouter();

  const attemptId = params.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    async function loadAttempt() {
      if (!attemptId) return;

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
          section_scores,
          answers,
          tests (
            title,
            duration_minutes
          )
        `)
        .eq('id', attemptId)
        .eq('user_id', user.id)
        .eq('status', 'submitted')
        .single();

      if (error || !data) {
  console.error('Attempt result error:', error);
  setAttempt(null);
  setLoading(false);
  return;
}

const { data: questionData, error: questionError } =
  await supabase
    .from('questions')
    .select(`
      id,
      question_number,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option,
      subject
    `)
    .eq('test_id', data.test_id)
    .order('question_number', {
      ascending: true,
    });

if (questionError) {
  console.error(
    'Question review error:',
    questionError
  );
} else {
  setQuestions(questionData || []);
}

setAttempt(data);
setLoading(false);
    }

    loadAttempt();
  }, [attemptId, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="font-semibold text-gray-700">
          Loading Result...
        </p>
      </main>
    );
  }

  if (!attempt) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white border rounded-2xl p-8 text-center">
          <h1 className="text-xl font-bold text-gray-800">
            Result Not Found
          </h1>

          <button
            onClick={() => router.push('/history')}
            className="mt-5 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold"
          >
            Back to History
          </button>
        </div>
      </main>
    );
  }

  const sectionScores =
    attempt.section_scores || {};

  const attempted =
    attempt.correct + attempt.wrong;

  const accuracy =
    attempted > 0
      ? Math.round(
          (attempt.correct / attempted) * 100
        )
      : 0;

  return (
    <main className="min-h-screen bg-gray-100">

      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">

          <div>
            <h1 className="text-xl font-extrabold text-gray-800">
              Test Result
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              {attempt.tests?.title || 'SSC Test'}
            </p>
          </div>

          <button
            onClick={() => router.push('/history')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm"
          >
            History
          </button>

        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6">

        {/* OVERALL SCORE */}

        <section className="bg-white border rounded-2xl p-6 shadow-sm">

          <div className="text-center">

            <p className="text-sm text-gray-500">
              Your Score
            </p>

            <p className="text-5xl font-extrabold text-blue-600 mt-1">
              {attempt.score}
            </p>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">

            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {attempted}
              </p>
              <p className="text-xs text-gray-500">
                Attempted
              </p>
            </div>

            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {attempt.correct}
              </p>
              <p className="text-xs text-gray-500">
                Correct
              </p>
            </div>

            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {attempt.wrong}
              </p>
              <p className="text-xs text-gray-500">
                Wrong
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {accuracy}%
              </p>
              <p className="text-xs text-gray-500">
                Accuracy
              </p>
            </div>

          </div>

        </section>

        {/* SECTION PERFORMANCE */}

        <section className="bg-white border rounded-2xl p-6 shadow-sm mt-5">

          <h2 className="text-lg font-bold text-gray-800">
            Section Performance
          </h2>

          <div className="space-y-3 mt-4">

            {[
              'Reasoning',
              'General Awareness',
              'Quantitative Aptitude',
              'English',
            ].map((subject) => {

              const section =
                sectionScores[subject];

              if (!section) return null;

              return (
                <div
                  key={subject}
                  className="border rounded-xl p-4"
                >

                  <div className="flex justify-between">
                    <p className="font-bold text-gray-800">
                      {subject}
                    </p>

                    <p className="font-bold text-blue-600">
                      {section.score}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">

                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="font-bold text-green-600">
                        {section.correct}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Correct
                      </p>
                    </div>

                    <div className="bg-red-50 rounded-lg p-2 text-center">
                      <p className="font-bold text-red-600">
                        {section.wrong}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Wrong
                      </p>
                    </div>

                    <div className="bg-gray-100 rounded-lg p-2 text-center">
                      <p className="font-bold text-gray-600">
                        {section.unattempted}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Unattempted
                      </p>
                    </div>

                  </div>

                </div>
              );
            })}

          </div>

        </section>

        {/* QUESTION REVIEW */}

<section className="bg-white border rounded-2xl p-6 shadow-sm mt-5">

  <h2 className="text-lg font-bold text-gray-800">
    Question Review
  </h2>

  <div className="space-y-4 mt-5">

    {questions.map((question) => {

      const userAnswer =
        attempt.answers?.[question.id] || null;

      const correctAnswer =
        question.correct_option;

      const isCorrect =
        userAnswer === correctAnswer;

      const isUnattempted =
        !userAnswer;

      let statusClass = 'border-gray-200';

      if (isUnattempted) {
        statusClass =
          'border-gray-300 bg-gray-50';
      } else if (isCorrect) {
        statusClass =
          'border-green-200 bg-green-50';
      } else {
        statusClass =
          'border-red-200 bg-red-50';
      }

      return (
        <div
          key={question.id}
          className={`border rounded-xl p-4 ${statusClass}`}
        >

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="text-xs font-bold text-blue-600">
                {question.subject}
              </p>

              <p className="font-bold text-gray-800 mt-1">
                Question {question.question_number}
              </p>

            </div>

            <div className="text-sm font-bold">

              {isUnattempted ? (
                <span className="text-gray-500">
                  ⚪ Unattempted
                </span>
              ) : isCorrect ? (
                <span className="text-green-600">
                  ✅ Correct
                </span>
              ) : (
                <span className="text-red-600">
                  ❌ Wrong
                </span>
              )}

            </div>

          </div>

          <p className="text-gray-800 font-medium mt-4">
            {question.question_text}
          </p>

          <div className="grid sm:grid-cols-2 gap-2 mt-4 text-sm">

            {[
              ['A', question.option_a],
              ['B', question.option_b],
              ['C', question.option_c],
              ['D', question.option_d],
            ].map(([letter, text]) => {

              const isUserAnswer =
                userAnswer === letter;

              const isCorrectAnswer =
                correctAnswer === letter;

              let optionClass =
                'border-gray-200 bg-white';

              if (isCorrectAnswer) {
                optionClass =
                  'border-green-500 bg-green-50';
              } else if (isUserAnswer) {
                optionClass =
                  'border-red-500 bg-red-50';
              }

              return (
                <div
                  key={letter}
                  className={`border rounded-lg p-3 ${optionClass}`}
                >
                  <span className="font-bold mr-2">
                    {letter}.
                  </span>

                  {text}

                  {isCorrectAnswer && (
                    <span className="ml-2 text-green-600 font-bold">
                      Correct
                    </span>
                  )}

                  {isUserAnswer &&
                    !isCorrectAnswer && (
                      <span className="ml-2 text-red-600 font-bold">
                        Your Answer
                      </span>
                    )}
                </div>
              );

            })}

          </div>

          <div className="mt-4 text-sm">

            <p>
              <span className="font-semibold">
                Your Answer:
              </span>{' '}

              {userAnswer || 'Not Attempted'}
            </p>

            <p className="mt-1">
              <span className="font-semibold">
                Correct Answer:
              </span>{' '}

              {correctAnswer}
            </p>

          </div>

        </div>
      );

    })}

  </div>

</section>

        {/* BACK */}

        <button
          onClick={() => router.push('/history')}
          className="w-full mt-5 py-3.5 rounded-xl bg-gray-800 text-white font-bold"
        >
          Back to Test History
        </button>

      </div>

    </main>
  );
}