import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldHelpProps {
  label: string;
  help: string;
  htmlFor?: string;
  className?: string;
}

/** A form-field label with a contextual help tooltip — used across every optional field in this module so users always know what a field means and why it matters. */
export function FieldHelp({ label, help, htmlFor, className }: FieldHelpProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-muted-foreground hover:text-foreground" tabIndex={-1}>
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{help}</TooltipContent>
      </Tooltip>
    </div>
  );
}
