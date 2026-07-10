import { Input } from "@/components/ui/input";
import { FieldHelp } from "@/components/FieldHelp";

interface NumberFieldProps {
  id: string;
  label: string;
  help: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  unit?: string;
  step?: string;
  disabled?: boolean;
}

/** Optional numeric input with a contextual-help label, used throughout the Emploi & Compétences module. Empty input is stored as null, never coerced to 0. */
export function NumberField({ id, label, help, value, onChange, unit, step, disabled }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <FieldHelp label={label} help={help} htmlFor={id} />
      <div className="relative">
        <Input
          id={id}
          type="number"
          step={step ?? "1"}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? null : Number(raw));
          }}
          className={unit ? "pr-10" : undefined}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
        )}
      </div>
    </div>
  );
}
