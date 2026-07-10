import { Switch } from "@/components/ui/switch";
import { FieldHelp } from "@/components/FieldHelp";

interface BooleanFieldProps {
  id: string;
  label: string;
  help: string;
  value: boolean | null | undefined;
  onChange: (value: boolean | null) => void;
  disabled?: boolean;
}

/** Optional yes/no field. Starts unset (null) — the switch reflects "false"/off until explicitly toggled on, but the underlying value stays null until the user has interacted with it at least once via handleChange. */
export function BooleanField({ id, label, help, value, onChange, disabled }: BooleanFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <FieldHelp label={label} help={help} htmlFor={id} />
      <Switch id={id} checked={!!value} disabled={disabled} onCheckedChange={(checked) => onChange(checked)} />
    </div>
  );
}
