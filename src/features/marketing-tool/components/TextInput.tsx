import { useRef, useEffect } from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

export function TextInput({
  value,
  onChange,
  placeholder = "Enter the text you want the avatar to speak...",
  disabled = false,
  maxLength = 5000,
}: TextInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        400
      )}px`;
    }
  }, [value]);

  return (
    <div className="w-full">
      <label
        htmlFor="marketing-text"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Script Text
      </label>
      <textarea
        ref={textareaRef}
        id="marketing-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className="w-full min-h-[150px] max-h-[400px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 resize-none"
        rows={6}
      />
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>
          {value.length > 0 ? `${value.length} / ${maxLength} characters` : ""}
        </span>
        <span>
          {value.trim().split(/\s+/).filter(Boolean).length > 0
            ? `${value.trim().split(/\s+/).filter(Boolean).length} words`
            : ""}
        </span>
      </div>
    </div>
  );
}
