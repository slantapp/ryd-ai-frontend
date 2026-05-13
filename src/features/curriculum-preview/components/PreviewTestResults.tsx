import { CheckCircle, XCircle, Terminal } from "lucide-react";

interface PreviewTestResultsProps {
  results: string[];
  code?: string;
}

export function PreviewTestResults({ results }: PreviewTestResultsProps) {
  if (results.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <Terminal className="mb-3 h-12 w-12 text-gray-300" />
        <p className="text-sm text-gray-500">
          Run your code to see the output here
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-700">Output</h3>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {results.map((result, index) => {
            const isPass = result.toLowerCase().includes("pass") || result.includes("✓");
            const isFail = result.toLowerCase().includes("fail") || result.includes("✗");

            return (
              <div
                key={index}
                className={`flex items-start gap-2 rounded-lg p-3 ${
                  isPass
                    ? "bg-green-50 border border-green-200"
                    : isFail
                    ? "bg-red-50 border border-red-200"
                    : "bg-gray-100 border border-gray-200"
                }`}
              >
                {isPass ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : isFail ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                ) : (
                  <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                )}
                <pre className="flex-1 whitespace-pre-wrap font-mono text-sm text-gray-700">
                  {result}
                </pre>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
