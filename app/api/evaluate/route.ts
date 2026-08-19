import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { testId, answers } = await req.json();

    if (!testId || !answers) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test ID and answers are required',
        },
        { status: 400 }
      );
    }

    // Get questions ONLY for this test.
    // Correct answers are accessed only on the server.
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, subject, correct_option')
      .eq('test_id', testId);

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          error: 'Could not load test questions',
        },
        { status: 500 }
      );
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No questions found for this test',
        },
        { status: 404 }
      );
    }

    // Get test marking scheme
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('positive_marks, negative_marks')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test not found',
        },
        { status: 404 }
      );
    }

    let score = 0;
let correct = 0;
let wrong = 0;

const sectionScores: Record<
  string,
  {
    score: number;
    correct: number;
    wrong: number;
    unattempted: number;
  }
> = {};

   questions.forEach((question) => {
  const userAnswer = answers[question.id];
  const subject = question.subject || 'Other';

  if (!sectionScores[subject]) {
    sectionScores[subject] = {
      score: 0,
      correct: 0,
      wrong: 0,
      unattempted: 0,
    };
  }

  if (!userAnswer) {
    sectionScores[subject].unattempted++;
    return;
  }

  if (userAnswer === question.correct_option) {
    score += Number(test.positive_marks);
    correct++;

    sectionScores[subject].score +=
      Number(test.positive_marks);

    sectionScores[subject].correct++;
  } else {
    score -= Number(test.negative_marks);
    wrong++;

    sectionScores[subject].score -=
      Number(test.negative_marks);

    sectionScores[subject].wrong++;
  }
});

    const unattempted = questions.length - correct - wrong;

    const { error: resultError } = await supabase
      .from('test_results')
      .insert([
        {
          test_id: testId,
          score,
          correct_answers: correct,
          wrong_answers: wrong,
        },
      ]);

    if (resultError) {
      console.error(resultError);

      return NextResponse.json(
        {
          success: false,
          error: 'Could not save test result',
        },
        { status: 500 }
      );
    }

    // Update the active test attempt
const { data: activeAttempt, error: attemptFindError } =
  await supabase
    .from('test_attempts')
    .select('id')
    .eq('test_id', testId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

if (attemptFindError) {
  console.error(
    'Could not find active attempt:',
    attemptFindError
  );
}

if (activeAttempt) {
  const { error: attemptUpdateError } =
    await supabase
      .from('test_attempts')
      .update({
  status: 'submitted',
  submitted_at: new Date().toISOString(),
  score,
  correct,
  wrong,
  unattempted,
  section_scores: sectionScores,
})
      .eq('id', activeAttempt.id);

  if (attemptUpdateError) {
    console.error(
      'Could not update test attempt:',
      attemptUpdateError
    );
  }
}

   return NextResponse.json({
  success: true,
  result: {
    score,
    correct,
    wrong,
    unattempted,
    sectionScores,
  },
});

  } catch (error) {
    console.error('Evaluation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Evaluation failed',
      },
      { status: 500 }
    );
  }
}