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
      .select('id, correct_option')
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

    questions.forEach((question) => {
      const userAnswer = answers[question.id];

      if (!userAnswer) {
        return;
      }

      if (userAnswer === question.correct_option) {
        score += Number(test.positive_marks);
        correct++;
      } else {
        score -= Number(test.negative_marks);
        wrong++;
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