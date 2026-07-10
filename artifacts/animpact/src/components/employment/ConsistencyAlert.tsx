import { AlertTriangle } from "lucide-react";

interface ConsistencyAlertProps {
  warnings: (string | null)[];
}

/** Non-blocking warning banner listing cross-field consistency issues (e.g. a breakdown exceeding the total headcount). */
export function ConsistencyAlert({ warnings }: ConsistencyAlertProps) {
  const messages = warnings.filter((w): w is string => !!w);
  if (messages.length === 0) return null;

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Incohérence détectée avec l'effectif total
        </p>
        <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc pl-4 space-y-0.5">
          {messages.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
