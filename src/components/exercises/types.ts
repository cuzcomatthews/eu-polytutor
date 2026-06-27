export interface ExerciseData {
  kind: string;
  prompt: string;
  payload: Record<string, unknown>;
}

export interface ExerciseProps {
  exercise: ExerciseData;
  onAnswerChange: (answer: Record<string, unknown> | null) => void;
  disabled?: boolean;
}
