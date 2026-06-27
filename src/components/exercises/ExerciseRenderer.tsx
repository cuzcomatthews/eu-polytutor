import { FillBlank } from "./FillBlank";
import { MatchPairs } from "./MatchPairs";
import { MultipleChoice } from "./MultipleChoice";
import { Ordering } from "./Ordering";
import { TypeAnswer } from "./TypeAnswer";

import type { ExerciseData } from "./types";

interface Props {
  exercise: ExerciseData;
  onAnswerChange: (a: Record<string, unknown> | null) => void;
  disabled?: boolean;
}

export function ExerciseRenderer({ exercise, onAnswerChange, disabled }: Props) {
  const props = { exercise, onAnswerChange, disabled };
  switch (exercise.kind) {
    case "multiple_choice":
      return <MultipleChoice {...props} />;
    case "fill_blank":
      return <FillBlank {...props} />;
    case "match_pairs":
      return <MatchPairs {...props} />;
    case "ordering":
      return <Ordering {...props} />;
    case "type_answer":
      return <TypeAnswer {...props} />;
    default:
      return (
        <p className="text-sm" style={{ color: "var(--color-error)" }}>
          Unknown exercise kind: {exercise.kind}
        </p>
      );
  }
}
