import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { answers } = body;

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid answers'
        },
        { status: 400 }
      );
    }

    // Fetch questions INCLUDING correct answers.
    // This happens ONLY on the server.
    const { data: questions, error } = await supabase
      .from('questions')
      .select(
        'id, correct_option'
      );

    if (error) {
      console.error('Question fetch error:', error);

      return NextResponse.json(
        {
          success: false,
          error: 'Could not evaluate test'
        },
        { status: 500 }
      );
    }

    let score = 0;
    let correct = 0;
    let wrong = 0;

    questions?.forEach((question) => {
      const userAnswer = answers[question.id];

      if (!userAnswer) {
        return;
      }

      if (userAnswer === question.correct_option) {
        score += 2;
        correct++;
      } else {
        score -= 0.5;
        wrong++;
      }
    });

    const unattempted =
      (questions?.length || 0) - correct - wrong;

    // Save result
    const { error: insertError } = await supabase
      .from('test_results')
      .insert([
        {
          score,
          correct_answers: correct,
          wrong_answers: wrong
        }
      ]);

    if (insertError) {
      console.error('Result save error:', insertError);

      return NextResponse.json(
        {
          success: false,
          error: 'Could not save result'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: {
        score,
        correct,
        wrong,
        unattempted
      }
    });

  } catch (error) {
    console.error('Evaluation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Evaluation failed'
      },
      { status: 500 }
    );
  }
}