import { useRef, useState } from "react";
import type { PointerEvent } from "react";

type Point = { x: number; y: number };

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

type Options = {
  minScale?: number;
  maxScale?: number;
};

export function useTouchZoom({ minScale = 1, maxScale = 3 }: Options = {}) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  function zoom(delta: number) {
    setScale((prev) => Math.min(maxScale, Math.max(minScale, prev + delta)));
  }

  function reset() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);

    if (pointersRef.current.size === 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      pinchRef.current = {
        distance: distance(first, second),
        scale,
      };
      dragRef.current.active = false;
      setIsDragging(false);
      return;
    }

    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: translate.x,
      originY: translate.y,
    };
    setIsDragging(true);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = Array.from(pointersRef.current.values());
      const ratio = pinchRef.current.distance > 0
        ? distance(first, second) / pinchRef.current.distance
        : 1;
      setScale(Math.min(maxScale, Math.max(minScale, pinchRef.current.scale * ratio)));
      return;
    }

    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    setTranslate({
      x: drag.originX + e.clientX - drag.startX,
      y: drag.originY + e.clientY - drag.startY,
    });
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;

    if (pointersRef.current.size === 1) {
      const [remainingId, remainingPoint] = Array.from(pointersRef.current.entries())[0];
      dragRef.current = {
        active: true,
        pointerId: remainingId,
        startX: remainingPoint.x,
        startY: remainingPoint.y,
        originX: translate.x,
        originY: translate.y,
      };
      setIsDragging(true);
    } else {
      dragRef.current.active = false;
      setIsDragging(false);
    }
  }

  function onPointerCancel(e: PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId);
    pinchRef.current = null;
    dragRef.current.active = false;
    setIsDragging(false);
  }

  return {
    scale,
    translate,
    isDragging,
    zoom,
    reset,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}