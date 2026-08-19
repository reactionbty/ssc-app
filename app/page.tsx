'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Question = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

type ReviewState = Record<string, boolean>;

const EXAM_DURATION = 60 * 60; // 60 minutes

export default function SSCExamPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<ReviewState>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);

  const [scoreResult, setScoreResult] = useState<{
    score: number;
    correct: number;
    wrong: number;
    unattempted: number;
  } | null>(null);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submittedRef = useRef(false);

  // --------------------------------------------------
  // LOAD QUESTIONS
  // --------------------------------------------------

  useEffect(() => {
    async function loadQuestions() {
      // IMPORTANT:
      // correct_option is still selected temporarily because
      // your current scoring system works on the client.
      // We will move scoring to the API in Phase 2.

      const { data, error } = await supabase
        .from('questions')
        .select(
          'id, question_text, option_a, option_b, option_c, option_d'
        );

      if (error) {
        console.error('Database connection error:', error);
        alert('SUPABASE ERROR: ' + error.message);
        return;
      }

      if (data && data.length > 0) {
        setQuestions(data);
      } else {
        alert('Your database connected, but the questions table is EMPTY!');
      }
    }

    loadQuestions();
  }, []);

  // --------------------------------------------------
  // RESTORE TEST PROGRESS
  // --------------------------------------------------

  useEffect(() => {
    const savedAnswers = localStorage.getItem('ssc_exam_answers');
    const savedReview = localStorage.getItem('ssc_exam_review');
    const savedIndex = localStorage.getItem('ssc_exam_current_index');
    const savedTime = localStorage.getItem('ssc_exam_time');

    if (savedAnswers) {
      setSelectedAnswers(JSON.parse(savedAnswers));
    }

    if (savedReview) {
      setMarkedForReview(JSON.parse(savedReview));
    }

    if (savedIndex) {
      setCurrentIndex(Number(savedIndex));
    }

    if (savedTime) {
      const parsedTime = Number(savedTime);

      if (parsedTime > 0) {
        setTimeLeft(parsedTime);
      }
    }
  }, []);

  // --------------------------------------------------
  // SAVE PROGRESS LOCALLY
  // --------------------------------------------------

  useEffect(() => {
    localStorage.setItem(
      'ssc_exam_answers',
      JSON.stringify(selectedAnswers)
    );
  }, [selectedAnswers]);

  useEffect(() => {
    localStorage.setItem(
      'ssc_exam_review',
      JSON.stringify(markedForReview)
    );
  }, [markedForReview]);

  useEffect(() => {
    localStorage.setItem(
      'ssc_exam_current_index',
      String(currentIndex)
    );
  }, [currentIndex]);

  useEffect(() => {
    localStorage.setItem(
      'ssc_exam_time',
      String(timeLeft)
    );
  }, [timeLeft]);

  // --------------------------------------------------
  // TIMER
  // --------------------------------------------------

  const submitTest = useCallback(async () => {
    if (submittedRef.current || questions.length === 0) {
      return;
    }

    submittedRef.current = true;
    setIsSubmitting(true);

    let score = 0;
    let correct = 0;
    let wrong = 0;

    questions.forEach((q) => {
      const userAnswer = selectedAnswers[q.id];

      if (userAnswer) {
        if (userAnswer === q.correct_option) {
          score += 2;
          correct++;
        } else {
          score -= 0.5;
          wrong++;
        }
      }
    });

    const unattempted = questions.length - correct - wrong;

    const { error } = await supabase
      .from('test_results')
      .insert([
        {
          score,
          correct_answers: correct,
          wrong_answers: wrong,
        },
      ]);

    if (error) {
      console.error('Error saving result:', error);
    }

    localStorage.removeItem('ssc_exam_answers');
    localStorage.removeItem('ssc_exam_review');
    localStorage.removeItem('ssc_exam_current_index');
    localStorage.removeItem('ssc_exam_time');

    setScoreResult({
      score,
      correct,
      wrong,
      unattempted,
    });

    setShowSubmitModal(false);
    setIsSubmitting(false);
  }, [questions, selectedAnswers]);

  useEffect(() => {
    if (questions.length === 0 || scoreResult || submittedRef.current) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);

          // Auto submit when timer reaches zero
          submitTest();

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questions.length, scoreResult, submitTest]);

  // --------------------------------------------------
  // SELECT ANSWER
  // --------------------------------------------------

  const handleOptionSelect = (optionLetter: string) => {
    if (!questions[currentIndex]) return;

    const questionId = questions[currentIndex].id;

    setSelectedAnswers((previous) => ({
      ...previous,
      [questionId]: optionLetter,
    }));
  };

  // --------------------------------------------------
  // CLEAR RESPONSE
  // --------------------------------------------------

  const clearResponse = () => {
    if (!questions[currentIndex]) return;

    const questionId = questions[currentIndex].id;

    setSelectedAnswers((previous) => {
      const updated = { ...previous };
      delete updated[questionId];
      return updated;
    });
  };

  // --------------------------------------------------
  // MARK / UNMARK FOR REVIEW
  // --------------------------------------------------

  const toggleReview = () => {
    if (!questions[currentIndex]) return;

    const questionId = questions[currentIndex].id;

    setMarkedForReview((previous) => ({
      ...previous,
      [questionId]: !previous[questionId],
    }));
  };

  // --------------------------------------------------
  // SAVE & NEXT
  // --------------------------------------------------

  const saveAndNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((previous) => previous + 1);
    }
  };

  // --------------------------------------------------
  // MARK FOR REVIEW & NEXT
  // --------------------------------------------------

  const markReviewAndNext = () => {
    if (!questions[currentIndex]) return;

    const questionId = questions[currentIndex].id;

    setMarkedForReview((previous) => ({
      ...previous,
      [questionId]: true,
    }));

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((previous) => previous + 1);
    }
  };

  // --------------------------------------------------
  // FORMAT TIMER
  // --------------------------------------------------

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(
      2,
      '0'
    )}`;
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">
            Loading Test Questions...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // RESULT SCREEN
  // --------------------------------------------------

  if (scoreResult) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>

            <h1 className="text-3xl font-bold text-gray-800">
              Test Completed
            </h1>

            <p className="text-gray-500 mt-2">
              Here is your performance summary
            </p>
          </div>

          <div className="mt-8 bg-blue-50 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-500">Your Score</p>

            <p className="text-5xl font-extrabold text-blue-600 mt-1">
              {scoreResult.score}
            </p>

            <p className="text-sm text-gray-500 mt-2">
              out of {questions.length * 2}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {scoreResult.correct}
              </p>
              <p className="text-xs text-gray-500 mt-1">Correct</p>
            </div>

            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {scoreResult.wrong}
              </p>
              <p className="text-xs text-gray-500 mt-1">Wrong</p>
            </div>

            <div className="bg-gray-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">
                {scoreResult.unattempted}
              </p>
              <p className="text-xs text-gray-500 mt-1">Unattempted</p>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full mt-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
          >
            Take Test Again
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  const isAnswered = Boolean(selectedAnswers[currentQ.id]);
  const isMarked = Boolean(markedForReview[currentQ.id]);

  const answeredCount = Object.keys(selectedAnswers).length;

  const markedCount = Object.values(markedForReview).filter(Boolean).length;

  const unattemptedCount = questions.length - answeredCount;

  const timeWarning = timeLeft <= 300;

  // --------------------------------------------------
  // EXAM INTERFACE
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-100 font-sans">

      {/* ================= HEADER ================= */}

      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">

          <div>
            <h1 className="font-bold text-gray-800 text-sm sm:text-lg">
              SSC CGL Tier-1 Mock Test
            </h1>

            <p className="text-xs text-gray-500 hidden sm:block">
              General Mock Test
            </p>
          </div>

          <div
            className={`px-4 py-2 rounded-lg font-mono font-bold text-sm sm:text-lg ${
              timeWarning
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            ⏱ {formatTime(timeLeft)}
          </div>

        </div>
      </header>

      {/* ================= MAIN ================= */}

      <main className="max-w-7xl mx-auto p-3 sm:p-5">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ================= QUESTION AREA ================= */}

          <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">

            {/* Question Header */}

            <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3">

              <div>
                <p className="text-sm font-bold text-gray-800">
                  Question {currentIndex + 1}
                  <span className="font-normal text-gray-400">
                    {' '}
                    / {questions.length}
                  </span>
                </p>
              </div>

              <div className="flex gap-2">

                {isAnswered && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                    Answered
                  </span>
                )}

                {isMarked && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                    Review
                  </span>
                )}

              </div>

            </div>

            {/* Question */}

            <div className="p-4 sm:p-7">

              <div className="mb-7">
                <p className="text-base sm:text-lg leading-7 text-gray-800 font-medium">
                  {currentQ.question_text}
                </p>
              </div>

              {/* Options */}

              <div className="space-y-3">

                {['a', 'b', 'c', 'd'].map((letter) => {

                  const upper = letter.toUpperCase();

                  const selected =
                    selectedAnswers[currentQ.id] === upper;

                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleOptionSelect(upper)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition ${
                        selected
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >

                      <div className="flex items-start gap-3">

                        <span
                          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                            selected
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-400 text-gray-600'
                          }`}
                        >
                          {upper}
                        </span>

                        <span className="pt-0.5">
                          {currentQ[`option_${letter}` as keyof Question]}
                        </span>

                      </div>

                    </button>
                  );
                })}

              </div>

            </div>

            {/* ================= ACTIONS ================= */}

            <div className="border-t bg-gray-50 p-4">

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">

                <button
                  type="button"
                  onClick={clearResponse}
                  disabled={!isAnswered}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold text-sm disabled:opacity-40"
                >
                  Clear Response
                </button>

                <button
                  type="button"
                  onClick={toggleReview}
                  className={`px-4 py-2.5 rounded-lg font-semibold text-sm ${
                    isMarked
                      ? 'bg-purple-600 text-white'
                      : 'border border-purple-300 bg-white text-purple-700'
                  }`}
                >
                  {isMarked ? 'Unmark Review' : 'Mark for Review'}
                </button>

              </div>

              <div className="flex justify-between gap-3 mt-4">

                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() =>
                    setCurrentIndex((previous) => previous - 1)
                  }
                  className="px-5 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                <button
                  type="button"
                  onClick={saveAndNext}
                  disabled={currentIndex === questions.length - 1}
                  className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save & Next →
                </button>

              </div>

              <button
                type="button"
                onClick={markReviewAndNext}
                disabled={currentIndex === questions.length - 1}
                className="w-full mt-3 py-2.5 rounded-lg border border-purple-300 bg-white hover:bg-purple-50 text-purple-700 font-semibold text-sm disabled:opacity-40"
              >
                Mark for Review & Next
              </button>

            </div>

          </section>

          {/* ================= PALETTE ================= */}

          <aside className="bg-white rounded-xl shadow-sm border p-4 sm:p-5 h-fit lg:sticky lg:top-24">

            <div className="mb-5">

              <h2 className="font-bold text-gray-800">
                Question Palette
              </h2>

              <div className="grid grid-cols-3 gap-2 mt-4">

                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="font-bold text-green-600">
                    {answeredCount}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Answered
                  </p>
                </div>

                <div className="bg-gray-100 rounded-lg p-2 text-center">
                  <p className="font-bold text-gray-600">
                    {unattemptedCount}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Unanswered
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <p className="font-bold text-purple-600">
                    {markedCount}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Review
                  </p>
                </div>

              </div>

            </div>

            <div className="max-h-[420px] overflow-y-auto pr-1">

              <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2">

                {questions.map((q, idx) => {

                  const answered = Boolean(selectedAnswers[q.id]);
                  const review = Boolean(markedForReview[q.id]);
                  const current = idx === currentIndex;

                  let colorClass =
                    'bg-gray-100 text-gray-700 border-gray-200';

                  if (review && answered) {
                    colorClass =
                      'bg-yellow-500 text-white border-yellow-500';
                  } else if (review) {
                    colorClass =
                      'bg-purple-600 text-white border-purple-600';
                  } else if (answered) {
                    colorClass =
                      'bg-green-500 text-white border-green-500';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative aspect-square rounded-lg border font-bold text-sm transition ${colorClass} ${
                        current
                          ? 'ring-4 ring-blue-300 ring-offset-1'
                          : ''
                      }`}
                    >
                      {idx + 1}

                      {review && (
                        <span className="absolute -top-1 -right-1 text-[9px]">
                          🚩
                        </span>
                      )}

                    </button>
                  );
                })}

              </div>

            </div>

            {/* Legend */}

            <div className="mt-5 pt-4 border-t space-y-2 text-xs text-gray-600">

              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-green-500" />
                Answered
              </div>

              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-gray-100 border" />
                Not Answered
              </div>

              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-purple-600" />
                Marked for Review
              </div>

              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-yellow-500" />
                Answered + Review
              </div>

            </div>

            {/* Submit */}

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full mt-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm"
            >
              SUBMIT EXAM
            </button>

          </aside>

        </div>

      </main>

      {/* ================= SUBMIT MODAL ================= */}

      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">

            <h2 className="text-xl font-bold text-gray-800">
              Submit Test?
            </h2>

            <p className="text-gray-500 text-sm mt-2">
              Are you sure you want to submit your test?
            </p>

            <div className="grid grid-cols-3 gap-3 mt-6">

              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="font-bold text-green-600">
                  {answeredCount}
                </p>
                <p className="text-xs text-gray-500">
                  Answered
                </p>
              </div>

              <div className="bg-gray-100 p-3 rounded-lg text-center">
                <p className="font-bold text-gray-600">
                  {unattemptedCount}
                </p>
                <p className="text-xs text-gray-500">
                  Unanswered
                </p>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <p className="font-bold text-purple-600">
                  {markedCount}
                </p>
                <p className="text-xs text-gray-500">
                  Review
                </p>
              </div>

            </div>

            <div className="flex gap-3 mt-7">

              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
              >
                Continue Test
              </button>

              <button
                type="button"
                onClick={submitTest}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Test'}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}