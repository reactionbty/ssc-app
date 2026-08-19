'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Connect your website to your Supabase database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SSCExamPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [scoreResult, setScoreResult] = useState<any>(null);

  // 1. Fetch questions from the database when the page loads
  useEffect(() => {
    async function loadQuestions() {
      const { data, error } = await supabase.from('questions').select('*');
     
      if (error) {
        console.error("Database connection error:", error);
        alert("SUPABASE ERROR: " + error.message); // This makes the error pop up on your screen!
      }
     
      if (data && data.length > 0) {
        setQuestions(data);
      } else if (data && data.length === 0) {
        alert("Your database connected, but the questions table is EMPTY!");
      }
    }
    loadQuestions();
  }, []);

  // 2. Save the user's selected option
  const handleOptionSelect = (optionLetter: string) => {
    const currentQuestionId = questions[currentIndex].id;
    setSelectedAnswers({ ...selectedAnswers, [currentQuestionId]: optionLetter });
  };

  // 3. Calculate score and save to database (+2 correct, -0.5 wrong)
  const handleSubmit = async () => {
    let score = 0;
    let correct = 0;
    let wrong = 0;

    questions.forEach((q) => {
      const userAnswer = selectedAnswers[q.id];
      if (userAnswer) {
        if (userAnswer === q.correct_option) {
          score += 2.0;
          correct++;
        } else {
          score -= 0.5;
          wrong++;
        }
      }
    });

    // Save the final result to the test_results table
    await supabase
      .from('test_results')
      .insert([{ score, correct_answers: correct, wrong_answers: wrong }]);

    // Show the result screen
    setScoreResult({ score, correct, wrong });
  };

  // Loading Screen
  if (questions.length === 0) {
    return <div className="flex h-screen items-center justify-center text-2xl font-bold text-blue-600">Loading Test Questions...</div>;
  }

  // Final Result Screen
  if (scoreResult) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-2xl text-center border-t-4 border-green-500">
          <h1 className="text-3xl font-extrabold mb-2 text-gray-800">Test Submitted!</h1>
          <p className="text-gray-500 mb-6">Here is your performance summary</p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-xl">Total Marks: <span className="font-bold text-blue-600 text-3xl">{scoreResult.score}</span></p>
          </div>
          
          <div className="flex justify-between px-4 mb-8 text-sm font-medium">
            <p className="text-green-600">Correct: {scoreResult.correct}</p>
            <p className="text-red-600">Wrong: {scoreResult.wrong}</p>
          </div>
          
          <button onClick={() => window.location.reload()} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
            Take Test Again
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  // The Live Exam Interface
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 p-4 md:p-6 gap-6 font-sans">
      
      {/* Left Box: Question & Options */}
      <div className="md:w-3/4 bg-white p-6 rounded-xl shadow-md flex flex-col justify-between border border-gray-200">
        <div>
          <div className="flex justify-between items-center border-b pb-4 mb-6">
            <h2 className="text-xl font-bold text-gray-800">SSC CGL Tier-1 Mock Exam</h2>
            <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded">Question {currentIndex + 1} of {questions.length}</span>
          </div>
          
          <p className="text-lg font-medium mb-8 text-gray-700">Q{currentIndex + 1}. {currentQ.question_text}</p>
          
          <div className="space-y-4">
            {['a', 'b', 'c', 'd'].map((letter) => {
              const upper = letter.toUpperCase();
              const isSelected = selectedAnswers[currentQ.id] === upper;
              return (
                <button
                  key={letter}
                  onClick={() => handleOptionSelect(upper)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                    isSelected ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-sm' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="mr-3 inline-block w-6 h-6 text-center rounded-full border border-current text-sm leading-5">
                    {upper}
                  </span> 
                  {currentQ[`option_${letter}`]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-10 pt-4 border-t">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <button
            disabled={currentIndex === questions.length - 1}
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            Save & Next
          </button>
        </div>
      </div>

      {/* Right Box: Question Palette */}
      <div className="md:w-1/4 bg-white p-6 rounded-xl shadow-md flex flex-col border border-gray-200">
        <h3 className="font-bold mb-6 text-gray-800 text-center border-b pb-3">Question Palette</h3>
        
        <div className="grid grid-cols-4 gap-3 mb-6">
          {questions.map((q, idx) => {
            const isAnswered = selectedAnswers[q.id];
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-full aspect-square rounded-lg font-bold text-sm flex items-center justify-center transition-all ${
                  isAnswered ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                } ${isCurrent ? 'ring-4 ring-blue-300 ring-offset-2' : ''}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-3 text-xs text-gray-500 mb-6">
          <div className="flex items-center"><span className="w-4 h-4 bg-green-500 rounded inline-block mr-2"></span> Answered</div>
          <div className="flex items-center"><span className="w-4 h-4 bg-gray-200 rounded inline-block mr-2"></span> Not Answered</div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-md transition-colors"
        >
          SUBMIT EXAM
        </button>
      </div>

    </div>
  );
}