import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface QuestionPreviewProps {
  questionText: string;
  questionType: "mcq" | "true_false" | "short_answer" | "fill_in_blank";
  options?: { key: string; text: string }[] | null;
  selectedAnswer?: string;
  onAnswerChange?: (answer: string) => void;
  disabled?: boolean;
  showCorrectAnswer?: boolean;
  correctAnswer?: string;
}

const QuestionPreview = ({
  questionText,
  questionType,
  options,
  selectedAnswer,
  onAnswerChange,
  disabled = false,
  showCorrectAnswer = false,
  correctAnswer,
}: QuestionPreviewProps) => {
  const questionId = `qp-${questionType}-${questionText
    .slice(0, 20)
    .replace(/\s+/g, "-")}`;

  const isCorrect = showCorrectAnswer && selectedAnswer === correctAnswer;
  const isIncorrect =
    showCorrectAnswer &&
    selectedAnswer != null &&
    selectedAnswer !== "" &&
    selectedAnswer !== correctAnswer;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 space-y-4">
      <p
        className="text-sm font-medium text-gray-900 leading-relaxed"
        id={questionId}
      >
        {questionText}
      </p>

      {questionType === "mcq" && (
        <MCQOptions
          options={options ?? []}
          selectedAnswer={selectedAnswer}
          onAnswerChange={onAnswerChange}
          disabled={disabled}
          showCorrectAnswer={showCorrectAnswer}
          correctAnswer={correctAnswer}
          questionId={questionId}
        />
      )}

      {questionType === "true_false" && (
        <TrueFalseOptions
          selectedAnswer={selectedAnswer}
          onAnswerChange={onAnswerChange}
          disabled={disabled}
          showCorrectAnswer={showCorrectAnswer}
          correctAnswer={correctAnswer}
          questionId={questionId}
        />
      )}

      {questionType === "short_answer" && (
        <div className="space-y-2">
          <Label htmlFor={`${questionId}-answer`}>Your Answer</Label>
          <Textarea
            id={`${questionId}-answer`}
            aria-labelledby={questionId}
            placeholder="Type your answer here..."
            value={selectedAnswer ?? ""}
            onChange={(e) => onAnswerChange?.(e.target.value)}
            disabled={disabled}
            rows={4}
            className={cn(
              showCorrectAnswer && isCorrect && "border-green-500 bg-green-50",
              showCorrectAnswer && isIncorrect && "border-red-500 bg-red-50"
            )}
          />
          {showCorrectAnswer && correctAnswer && (
            <CorrectAnswerDisplay correctAnswer={correctAnswer} />
          )}
        </div>
      )}

      {questionType === "fill_in_blank" && (
        <div className="space-y-2">
          <Label htmlFor={`${questionId}-blank`}>Fill in the blank</Label>
          <Input
            id={`${questionId}-blank`}
            aria-labelledby={questionId}
            placeholder="Type your answer..."
            value={selectedAnswer ?? ""}
            onChange={(e) => onAnswerChange?.(e.target.value)}
            disabled={disabled}
            className={cn(
              "max-w-md",
              showCorrectAnswer && isCorrect && "border-green-500 bg-green-50",
              showCorrectAnswer && isIncorrect && "border-red-500 bg-red-50"
            )}
          />
          {showCorrectAnswer && correctAnswer && (
            <CorrectAnswerDisplay correctAnswer={correctAnswer} />
          )}
        </div>
      )}
    </Card>
  );
};

const MCQOptions = ({
  options,
  selectedAnswer,
  onAnswerChange,
  disabled,
  showCorrectAnswer,
  correctAnswer,
  questionId,
}: {
  options: { key: string; text: string }[];
  selectedAnswer?: string;
  onAnswerChange?: (answer: string) => void;
  disabled: boolean;
  showCorrectAnswer: boolean;
  correctAnswer?: string;
  questionId: string;
}) => (
  <div role="radiogroup" aria-labelledby={questionId} className="space-y-2">
    {options.map((option) => {
      const isSelected = selectedAnswer === option.key;
      const isOptionCorrect = showCorrectAnswer && option.key === correctAnswer;
      const isOptionIncorrect =
        showCorrectAnswer && isSelected && option.key !== correctAnswer;

      return (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={isSelected}
          aria-label={`${option.key}. ${option.text}`}
          disabled={disabled}
          onClick={() => !disabled && onAnswerChange?.(option.key)}
          className={cn(
            "w-full text-start rounded-lg px-4 py-3 text-sm font-medium transition-colors flex items-center gap-3",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            !showCorrectAnswer &&
              isSelected &&
              "bg-blue-600 text-white shadow-md",
            !showCorrectAnswer &&
              !isSelected &&
              "bg-slate-50 text-gray-700 hover:bg-slate-100",
            isOptionCorrect &&
              "bg-green-100 text-green-800 border border-green-300",
            isOptionIncorrect &&
              "bg-red-100 text-red-800 border border-red-300",
            showCorrectAnswer &&
              !isOptionCorrect &&
              !isOptionIncorrect &&
              "bg-slate-50 text-gray-700",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span
            className={cn(
              "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
              !showCorrectAnswer && isSelected && "bg-white/20 text-white",
              !showCorrectAnswer && !isSelected && "bg-slate-200 text-gray-600",
              isOptionCorrect && "bg-green-500 text-white",
              isOptionIncorrect && "bg-red-500 text-white",
              showCorrectAnswer &&
                !isOptionCorrect &&
                !isOptionIncorrect &&
                "bg-slate-200 text-gray-600"
            )}
          >
            {option.key}
          </span>
          <span>{option.text}</span>
        </button>
      );
    })}
  </div>
);

const TrueFalseOptions = ({
  selectedAnswer,
  onAnswerChange,
  disabled,
  showCorrectAnswer,
  correctAnswer,
  questionId,
}: {
  selectedAnswer?: string;
  onAnswerChange?: (answer: string) => void;
  disabled: boolean;
  showCorrectAnswer: boolean;
  correctAnswer?: string;
  questionId: string;
}) => {
  const tfOptions = [
    { key: "True", text: "True" },
    { key: "False", text: "False" },
  ];

  return (
    <div role="radiogroup" aria-labelledby={questionId} className="flex gap-3">
      {tfOptions.map((option) => {
        const isSelected = selectedAnswer === option.key;
        const isOptionCorrect =
          showCorrectAnswer && option.key === correctAnswer;
        const isOptionIncorrect =
          showCorrectAnswer && isSelected && option.key !== correctAnswer;

        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.text}
            disabled={disabled}
            onClick={() => !disabled && onAnswerChange?.(option.key)}
            className={cn(
              "flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors text-center",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              !showCorrectAnswer &&
                isSelected &&
                "bg-blue-600 text-white shadow-md",
              !showCorrectAnswer &&
                !isSelected &&
                "bg-slate-50 text-gray-700 hover:bg-slate-100",
              isOptionCorrect &&
                "bg-green-100 text-green-800 border border-green-300",
              isOptionIncorrect &&
                "bg-red-100 text-red-800 border border-red-300",
              showCorrectAnswer &&
                !isOptionCorrect &&
                !isOptionIncorrect &&
                "bg-slate-50 text-gray-700",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {option.text}
          </button>
        );
      })}
    </div>
  );
};

const CorrectAnswerDisplay = ({ correctAnswer }: { correctAnswer: string }) => (
  <p className="text-xs font-medium text-green-700 bg-green-50 rounded-md px-3 py-2">
    Correct answer: {correctAnswer}
  </p>
);

export default QuestionPreview;
