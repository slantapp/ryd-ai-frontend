import { RUN_DETAILS_PREFIX } from "@/utils/codeExecution/runFeedback";

export function ConsoleLines({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        if (line.startsWith(RUN_DETAILS_PREFIX)) {
          return (
            <details key={index} className="text-gray-500">
              <summary className="cursor-pointer text-gray-400">Show details</summary>
              <pre className="mt-1 whitespace-pre-wrap break-all text-xs">
                {line.slice(RUN_DETAILS_PREFIX.length)}
              </pre>
            </details>
          );
        }
        let color = "text-gray-300";
        if (line.startsWith("✅") || line.startsWith("✓")) color = "text-green-400";
        else if (line.startsWith("❌") || line.startsWith("✗")) color = "text-red-400";
        else if (line.startsWith("⚠️")) color = "text-yellow-400";
        return (
          <div key={index} className={`${color} whitespace-pre-wrap break-all`}>
            {line}
          </div>
        );
      })}
    </div>
  );
}
