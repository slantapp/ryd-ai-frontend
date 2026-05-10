import { User } from "lucide-react";
import type { InstructorType } from "../types";

interface InstructorSelectorProps {
  selected: InstructorType;
  onChange: (instructor: InstructorType) => void;
  disabled?: boolean;
}

const instructors: { id: InstructorType; label: string; description: string }[] = [
  {
    id: "woman",
    label: "Female",
    description: "Female instructor voice",
  },
  {
    id: "man",
    label: "Male",
    description: "Male instructor voice",
  },
];

export function InstructorSelector({
  selected,
  onChange,
  disabled = false,
}: InstructorSelectorProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Select Avatar
      </label>
      <div className="flex gap-3">
        {instructors.map((instructor) => (
          <button
            key={instructor.id}
            type="button"
            onClick={() => onChange(instructor.id)}
            disabled={disabled}
            className={`flex-1 flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
              selected === instructor.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                selected === instructor.id
                  ? "bg-primary/10"
                  : "bg-gray-100"
              }`}
            >
              <User
                className={`h-6 w-6 ${
                  selected === instructor.id ? "text-primary" : "text-gray-500"
                }`}
              />
            </div>
            <span className="text-sm font-medium">{instructor.label}</span>
            <span className="text-xs text-gray-500">{instructor.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
