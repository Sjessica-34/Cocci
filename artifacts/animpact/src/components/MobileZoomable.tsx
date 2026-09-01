import type { ReactNode, RefObject } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTouchZoom } from "@/hooks/useTouchZoom";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  viewportRef?: RefObject<HTMLDivElement | null>;
};

export function MobileZoomable({ children, className, viewportRef }: Props) {
  const {
    scale,
    translate,
    isDragging,
    zoom,
    reset,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useTouchZoom();

  return (
    <div
      ref={viewportRef}
      className={cn("relative overflow-hidden touch-none", className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 0.15s ease",
          width: "100%",
        }}
      >
        {children}
      </div>

      <div
        className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-lg border border-border bg-background/90 p-1 shadow-sm sm:hidden"
        aria-label="Contrôles de zoom"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => zoom(0.25)}
          aria-label="Zoomer"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => zoom(-0.25)}
          aria-label="Dézoomer"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={reset}
          aria-label="Réinitialiser le zoom"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <p className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-background/85 px-2.5 py-1 text-center text-[11px] text-muted-foreground shadow-sm sm:hidden">
        Pincez pour zoomer · faites glisser pour déplacer
      </p>
    </div>
  );
}