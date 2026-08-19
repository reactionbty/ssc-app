'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Question = {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  subject: string;
};

type Test = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  positive_marks: number;
  negative_marks: number;
};

type Result = {
  score: number;
  correct: number;
  wrong: number;
  unattempted: number;
};

const SUBJECT_ORDER = [
  'Reasoning',
  'General Awareness',
  'Quantitative Aptitude',
  'English',
];

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();

  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [markedForReview, setMarkedForReview] = useState<
    Record<string, boolean>
  >({});
  const [visitedQuestions, setVisitedQuestions] = useState<
    Record<string, boolean>
  >({});

  const [timeLeft, setTimeLeft] = useState(0);
  const [examEndTime, setExamEndTime] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [scoreResult, setScoreResult] = useState<Result | null>(null);

  const submittedRef = useRef(false);

  // ==================================================
  // LOAD TEST + QUESTIONS
  // ==================================================

  useEffect(() => {
    if (!testId) return;

    async function loadTest() {
      setLoading(true);

      const { data: testData, error: testError } = await supabase
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

      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select(
          'id, question_number, question_text, option_a, option_b, option_c, option_d, subject'
        )
        .eq('test_id', testId);

      if (questionError) {
        console.error(questionError);
        alert('Questions could not be loaded.');
        router.push('/');
        return;
      }

      if (!questionData || questionData.length === 0) {
        alert('This test has no questions.');
        router.push('/');
        return;
      }

      // Arrange questions by the standard SSC section order.
      const orderedQuestions = [...questionData].sort(
         (a: any, b: any) => {
         return a.question_number - b.question_number;
       }
      );

      setTest(testData);
setQuestions(orderedQuestions);
await createOrResumeAttempt(orderedQuestions);

setLoading(false);



// ==========================================
// RESTORE OR CREATE EXAM END TIME
// ==========================================

const endTimeKey = `ssc_exam_end_time_${testId}`;

const savedEndTime = localStorage.getItem(endTimeKey);

let endTime: number;

if (savedEndTime) {
  endTime = Number(savedEndTime);
} else {
  endTime =
    Date.now() +
    testData.duration_minutes * 60 * 1000;

  localStorage.setItem(
    endTimeKey,
    String(endTime)
  );
}

setExamEndTime(endTime);

// Calculate remaining time immediately.
const remainingSeconds = Math.max(
  0,
  Math.floor((endTime - Date.now()) / 1000)
);

setTimeLeft(remainingSeconds);

setLoading(false);
    }

    loadTest();
  }, [testId, router]);

  // ==================================================
  // SECTION DATA
  // ==================================================

  const availableSubjects = useMemo(() => {
    const subjects = Array.from(
      new Set(questions.map((q) => q.subject))
    );

    return SUBJECT_ORDER.filter((subject) =>
      subjects.includes(subject)
    );
  }, [questions]);

  const questionsBySubject = useMemo(() => {
    const result: Record<string, Question[]> = {};

    availableSubjects.forEach((subject) => {
      result[subject] = questions.filter(
        (question) => question.subject === subject
      );
    });

    return result;
  }, [questions, availableSubjects]);

  const createOrResumeAttempt = async (
  loadedQuestions: Question[]
) => {
  if (!testId) return;

  const { data: existingAttempt, error: existingError } =
    await supabase
      .from('test_attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

  if (existingError) {
    console.error(
      'Attempt lookup error:',
      existingError
    );
    return;
  }

  if (existingAttempt) {
  setAttemptId(existingAttempt.id);

  const savedQuestionIndex = loadedQuestions.findIndex(
    (q: any) =>
      q.question_number ===
      existingAttempt.last_question_number
  );

  if (savedQuestionIndex >= 0) {
    setCurrentIndex(savedQuestionIndex);
  }

  return;
}

  const { data: newAttempt, error: createError } =
    await supabase
      .from('test_attempts')
      .insert({
        test_id: testId,
        status: 'in_progress',
        last_question_number: 1,
      })
      .select()
      .single();

  if (createError) {
    console.error(
      'Attempt creation error:',
      createError
    );
    return;
  }

  setAttemptId(newAttempt.id);
};

  const currentQuestion = questions[currentIndex];
  useEffect(() => {
  if (!attemptId || !currentQuestion) return;

  const updateCurrentQuestion = async () => {
    const { error } = await supabase
      .from('test_attempts')
      .update({
        last_question_number:
          currentQuestion.question_number,
      })
      .eq('id', attemptId);

    if (error) {
      console.error(
        'Failed to save current question:',
        error
      );
    }
  };

  updateCurrentQuestion();
}, [attemptId, currentQuestion]);
  useEffect(() => {
  if (!currentQuestion) return;

  setVisitedQuestions((previous) => ({
    ...previous,
    [currentQuestion.id]: true,
  }));
}, [currentQuestion]);

  const currentSubject = currentQuestion?.subject || '';

  const currentSubjectQuestions =
    questionsBySubject[currentSubject] || [];

  // ==================================================
  // TIMER
  // ==================================================

  const submitTest = useCallback(async () => {
    if (
      submittedRef.current ||
      questions.length === 0 ||
      !testId
    ) {
      return;
    }

    submittedRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testId,
          answers: selectedAnswers,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || 'Submission failed'
        );
      }

      localStorage.removeItem(
        `ssc_exam_answers_${testId}`
      );

      localStorage.removeItem(
        `ssc_exam_review_${testId}`
      );

      localStorage.removeItem(
       `ssc_exam_visited_${testId}`
      );

      localStorage.removeItem(
        `ssc_exam_index_${testId}`
      );

      localStorage.removeItem(
  `ssc_exam_end_time_${testId}`
);

      setScoreResult(data.result);
      setShowSubmitModal(false);

    } catch (error) {
      console.error(error);

      alert(
        'Could not submit the test. Please check your internet connection.'
      );

      submittedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [questions.length, selectedAnswers, testId]);

  useEffect(() => {
  if (
    loading ||
    questions.length === 0 ||
    scoreResult ||
    submittedRef.current ||
    !examEndTime
  ) {
    return;
  }

  const updateTimer = () => {
    const remaining = Math.max(
      0,
      Math.floor(
        (examEndTime - Date.now()) / 1000
      )
    );

    setTimeLeft(remaining);

    if (remaining <= 0) {
      submitTest();
    }
  };

  // Update immediately.
  updateTimer();

  // Keep checking the actual end time.
  const timer = setInterval(
    updateTimer,
    1000
  );

  return () => clearInterval(timer);

}, [
  loading,
  questions.length,
  scoreResult,
  examEndTime,
  submitTest,
]);

  // ==================================================
  // SAVE PROGRESS
  // ==================================================

  useEffect(() => {
    if (!testId) return;

    localStorage.setItem(
      `ssc_exam_answers_${testId}`,
      JSON.stringify(selectedAnswers)
    );
  }, [selectedAnswers, testId]);

  useEffect(() => {
    if (!testId) return;

    localStorage.setItem(
      `ssc_exam_review_${testId}`,
      JSON.stringify(markedForReview)
    );
  }, [markedForReview, testId]);
  
  useEffect(() => {
  if (!testId) return;

  localStorage.setItem(
    `ssc_exam_visited_${testId}`,
    JSON.stringify(visitedQuestions)
  );
}, [visitedQuestions, testId]);

  useEffect(() => {
    if (!testId) return;

    localStorage.setItem(
      `ssc_exam_index_${testId}`,
      String(currentIndex)
    );
  }, [currentIndex, testId]);

  // ==================================================
  // RESTORE ANSWERS
  // ==================================================

  useEffect(() => {
    if (!testId) return;

    const answers = localStorage.getItem(
      `ssc_exam_answers_${testId}`
    );

    const review = localStorage.getItem(
      `ssc_exam_review_${testId}`
    );
    const visited = localStorage.getItem(
      `ssc_exam_visited_${testId}`
    );


    if (answers) {
      setSelectedAnswers(JSON.parse(answers));
    }

    if (review) {
      setMarkedForReview(JSON.parse(review));
    }

    if (visited) {
      setVisitedQuestions(JSON.parse(visited));
    }

  }, [testId]);

  // ==================================================
  // QUESTION NAVIGATION
  // ==================================================

  const selectAnswer = (answer: string) => {
    if (!currentQuestion) return;

    setSelectedAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: answer,
    }));
  };

  const clearResponse = () => {
    if (!currentQuestion) return;

    setSelectedAnswers((previous) => {
      const updated = { ...previous };

      delete updated[currentQuestion.id];

      return updated;
    });
  };

  const toggleReview = () => {
    if (!currentQuestion) return;

    setMarkedForReview((previous) => ({
      ...previous,
      [currentQuestion.id]:
        !previous[currentQuestion.id],
    }));
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((previous) => previous + 1);
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((previous) => previous - 1);
    }
  };

  const markReviewAndNext = () => {
    if (!currentQuestion) return;

    setMarkedForReview((previous) => ({
      ...previous,
      [currentQuestion.id]: true,
    }));

    nextQuestion();
  };

  // ==================================================
  // SECTION SWITCHING
  // ==================================================

  const goToSubject = (subject: string) => {
    const index = questions.findIndex(
      (question) => question.subject === subject
    );

    if (index !== -1) {
      setCurrentIndex(index);
    }
  };

  // ==================================================
  // TIMER FORMAT
  // ==================================================

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor(
      (seconds % 3600) / 60
    );

    const secs = seconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(
        minutes
      ).padStart(2, '0')}:${String(secs).padStart(
        2,
        '0'
      )}`;
    }

    return `${String(minutes).padStart(
      2,
      '0'
    )}:${String(secs).padStart(2, '0')}`;
  };

  // ==================================================
  // COUNTS
  // ==================================================

  const answeredCount =
    Object.keys(selectedAnswers).length;

  const markedCount =
    Object.values(markedForReview).filter(Boolean)
      .length;

  const unattemptedCount =
    questions.length - answeredCount;

  const subjectAnsweredCount =
    currentSubjectQuestions.filter(
      (question) => selectedAnswers[question.id]
    ).length;

  const subjectMarkedCount =
    currentSubjectQuestions.filter(
      (question) => markedForReview[question.id]
    ).length;

  const isAnswered =
    Boolean(
      currentQuestion &&
        selectedAnswers[currentQuestion.id]
    );

  const isMarked =
    Boolean(
      currentQuestion &&
        markedForReview[currentQuestion.id]
    );

  // ==================================================
  // LOADING
  // ==================================================

  if (loading || !test || !currentQuestion) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">

          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />

          <p className="font-semibold text-gray-700">
            Loading Test...
          </p>

        </div>
      </main>
    );
  }

  // ==================================================
  // RESULT
  // ==================================================

  if (scoreResult) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">

        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 sm:p-8">

          <div className="text-center">

            <div className="text-5xl mb-4">
              🎉
            </div>

            <h1 className="text-3xl font-extrabold text-gray-800">
              Test Completed
            </h1>

            <p className="text-gray-500 mt-2">
              {test.title}
            </p>

          </div>

          <div className="bg-blue-50 rounded-xl p-6 text-center mt-7">

            <p className="text-sm text-gray-500">
              Your Score
            </p>

            <p className="text-5xl font-extrabold text-blue-600 mt-1">
              {scoreResult.score}
            </p>

          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">

            <div className="bg-green-50 rounded-xl p-4 text-center">

              <p className="text-2xl font-bold text-green-600">
                {scoreResult.correct}
              </p>

              <p className="text-xs text-gray-500">
                Correct
              </p>

            </div>

            <div className="bg-red-50 rounded-xl p-4 text-center">

              <p className="text-2xl font-bold text-red-600">
                {scoreResult.wrong}
              </p>

              <p className="text-xs text-gray-500">
                Wrong
              </p>

            </div>

            <div className="bg-gray-100 rounded-xl p-4 text-center">

              <p className="text-2xl font-bold text-gray-600">
                {scoreResult.unattempted}
              </p>

              <p className="text-xs text-gray-500">
                Unattempted
              </p>

            </div>

          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full mt-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
          >
            Back to Tests
          </button>

        </div>

      </main>
    );
  }

  // ==================================================
  // EXAM UI
  // ==================================================

  const timeWarning = timeLeft <= 300;

  return (
    <main className="min-h-screen bg-gray-100">

      {/* HEADER */}

      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">

        <div className="max-w-7xl mx-auto px-3 sm:px-5 py-3">

          <div className="flex items-center justify-between gap-3">

            <div className="min-w-0">

              <h1 className="font-bold text-gray-800 text-sm sm:text-lg truncate">
                {test.title}
              </h1>

              <p className="text-xs text-gray-500 hidden sm:block">
                {questions.length} Questions
              </p>

            </div>

            <div
              className={`px-3 sm:px-5 py-2 rounded-lg font-mono font-bold text-sm sm:text-lg ${
                timeWarning
                  ? 'bg-red-100 text-red-600 animate-pulse'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              ⏱ {formatTime(timeLeft)}
            </div>

          </div>

          {/* SECTION TABS */}

          <div className="flex gap-1 sm:gap-2 mt-3 overflow-x-auto pb-1">

            {availableSubjects.map((subject) => {

              const active =
                subject === currentSubject;

              const count =
                questionsBySubject[subject]?.length || 0;

              return (
                <button
                  key={subject}
                  onClick={() => goToSubject(subject)}
                  className={`shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {subject}
                  <span className="ml-1 opacity-75">
                    ({count})
                  </span>
                </button>
              );

            })}

          </div>

        </div>

      </header>

      {/* MAIN */}

      <div className="max-w-7xl mx-auto p-3 sm:p-5">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* QUESTION */}

          <section className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">

            {/* QUESTION HEADER */}

            <div className="px-4 sm:px-6 py-4 border-b flex justify-between items-center gap-3">

              <div>

                <p className="text-xs text-blue-600 font-bold uppercase">
                  {currentSubject}
                </p>

                <p className="font-bold text-gray-800 mt-1">
                  Question {currentQuestion.question_number}
                  <span className="font-normal text-gray-400">
                    {' '}
                    / {questions.length}
                  </span>
                </p>

              </div>

              <div className="text-right text-xs text-gray-500">

                <p>
                  Section: {subjectAnsweredCount}/
                  {currentSubjectQuestions.length}
                </p>

                {subjectMarkedCount > 0 && (
                  <p className="text-purple-600 font-semibold">
                    {subjectMarkedCount} marked
                  </p>
                )}

              </div>

            </div>

            {/* QUESTION CONTENT */}

            <div className="p-4 sm:p-7">

              <p className="text-base sm:text-lg leading-7 font-medium text-gray-800">
                {currentQuestion.question_text}
              </p>

              <div className="space-y-3 mt-7">

                {['a', 'b', 'c', 'd'].map((letter) => {

                  const upper = letter.toUpperCase();

                  const selected =
                    selectedAnswers[currentQuestion.id] ===
                    upper;

                  const option =
                    currentQuestion[
                      `option_${letter}` as keyof Question
                    ];

                  return (
                    <button
                      key={letter}
                      onClick={() =>
                        selectAnswer(upper)
                      }
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition ${
                        selected
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >

                      <div className="flex gap-3 items-start">

                        <span
                          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            selected
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-400 text-gray-600'
                          }`}
                        >
                          {upper}
                        </span>

                        <span className="pt-1">
                          {option}
                        </span>

                      </div>

                    </button>
                  );
                })}

              </div>

            </div>

            {/* ACTIONS */}

            <div className="border-t bg-gray-50 p-4">

              <div className="flex flex-wrap gap-2">

                <button
                  onClick={clearResponse}
                  disabled={!isAnswered}
                  className="px-4 py-2.5 rounded-lg bg-white border font-semibold text-sm disabled:opacity-40"
                >
                  Clear Response
                </button>

                <button
                  onClick={toggleReview}
                  className={`px-4 py-2.5 rounded-lg font-semibold text-sm ${
                    isMarked
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border text-purple-700'
                  }`}
                >
                  {isMarked
                    ? 'Unmark Review'
                    : 'Mark for Review'}
                </button>

              </div>

              <div className="flex justify-between gap-3 mt-4">

                <button
                  onClick={previousQuestion}
                  disabled={currentIndex === 0}
                  className="px-5 py-3 rounded-lg bg-gray-200 font-bold disabled:opacity-40"
                >
                  ← Previous
                </button>

                <button
                  onClick={nextQuestion}
                  disabled={
                    currentIndex ===
                    questions.length - 1
                  }
                  className="px-5 py-3 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-40"
                >
                  Save & Next →
                </button>

              </div>

              <button
                onClick={markReviewAndNext}
                disabled={
                  currentIndex ===
                  questions.length - 1
                }
                className="w-full mt-3 py-2.5 rounded-lg bg-white border border-purple-300 text-purple-700 font-semibold text-sm disabled:opacity-40"
              >
                Mark for Review & Next
              </button>

            </div>

          </section>

          {/* SIDEBAR */}

          <aside className="bg-white rounded-xl border shadow-sm p-4 h-fit lg:sticky lg:top-28">

            {/* OVERALL STATUS */}

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
            <div className="mt-5 border-t pt-4">

  <p className="text-xs font-bold text-gray-500 uppercase mb-3">
    Question Status
  </p>

  <div className="grid grid-cols-2 gap-2 text-xs">

    <div className="flex items-center gap-2">
      <span className="w-4 h-4 rounded bg-gray-100 border" />
      <span>Not Visited</span>
    </div>

    <div className="flex items-center gap-2">
      <span className="w-4 h-4 rounded bg-red-500" />
      <span>Not Answered</span>
    </div>

    <div className="flex items-center gap-2">
      <span className="w-4 h-4 rounded bg-green-500" />
      <span>Answered</span>
    </div>

    <div className="flex items-center gap-2">
      <span className="w-4 h-4 rounded bg-purple-600" />
      <span>Review</span>
    </div>

    <div className="flex items-center gap-2 col-span-2">
      <span className="w-4 h-4 rounded bg-yellow-500" />
      <span>Answered + Review</span>
    </div>

  </div>

</div>

            {/* SECTION PALETTE */}

            <div className="mt-5 border-t pt-4">

              <p className="text-xs font-bold text-gray-500 uppercase mb-3">
                {currentSubject}
              </p>

              <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto">

                {currentSubjectQuestions.map(
                  (question) => {

                    const questionIndex =
                      questions.findIndex(
                        (q) => q.id === question.id
                      );

                    const answered = Boolean(
  selectedAnswers[question.id]
);

const review = Boolean(
  markedForReview[question.id]
);

const visited = Boolean(
  visitedQuestions[question.id]
);

const current =
  questionIndex === currentIndex;

let color =
  'bg-gray-100 text-gray-700 border-gray-200';

// Answered + Marked for Review
if (review && answered) {
  color =
    'bg-yellow-500 text-white border-yellow-500';

// Marked for Review
} else if (review) {
  color =
    'bg-purple-600 text-white border-purple-600';

// Answered
} else if (answered) {
  color =
    'bg-green-500 text-white border-green-500';

// Visited but not answered
} else if (visited) {
  color =
    'bg-red-500 text-white border-red-500';
}

                    return (
                      <button
                        key={question.id}
                        onClick={() =>
                          setCurrentIndex(
                            questionIndex
                          )
                        }
                        className={`aspect-square rounded-lg border font-bold text-sm ${color} ${
                          current
                            ? 'ring-4 ring-blue-300 ring-offset-1'
                            : ''
                        }`}
                      >
                        {questionIndex + 1}
                      </button>
                    );

                  }
                )}

              </div>

            </div>

            {/* SUBMIT */}

            <button
              onClick={() =>
                setShowSubmitModal(true)
              }
              className="w-full mt-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
            >
              SUBMIT EXAM
            </button>

          </aside>

        </div>

      </div>

      {/* SUBMIT MODAL */}

      {showSubmitModal && (

        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">

            <h2 className="text-xl font-bold text-gray-800">
              Submit Test?
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              Please check your responses before submitting.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-6">

              <div className="bg-green-50 rounded-lg p-3 text-center">

                <p className="text-xl font-bold text-green-600">
                  {answeredCount}
                </p>

                <p className="text-xs text-gray-500">
                  Answered
                </p>

              </div>

              <div className="bg-gray-100 rounded-lg p-3 text-center">

                <p className="text-xl font-bold text-gray-600">
                  {unattemptedCount}
                </p>

                <p className="text-xs text-gray-500">
                  Unanswered
                </p>

              </div>

              <div className="bg-purple-50 rounded-lg p-3 text-center">

                <p className="text-xl font-bold text-purple-600">
                  {markedCount}
                </p>

                <p className="text-xs text-gray-500">
                  Review
                </p>

              </div>

            </div>

            <div className="flex gap-3 mt-7">

              <button
                onClick={() =>
                  setShowSubmitModal(false)
                }
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-lg bg-gray-200 font-bold"
              >
                Continue
              </button>

              <button
                onClick={submitTest}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-lg bg-red-600 text-white font-bold disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Submitting...'
                  : 'Submit Test'}
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}