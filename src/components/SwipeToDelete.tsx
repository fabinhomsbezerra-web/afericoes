"use client";

import { useRef, useState } from "react";

type Props = {
  onDelete: () => void;
  children: React.ReactNode;
};

const REVEAL_WIDTH = 92;

export default function SwipeToDelete({ onDelete, children }: Props) {
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startTranslate = useRef(0);
  const lockedAxis = useRef<"x" | "y" | null>(null);
  const startY = useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startTranslate.current = translateX;
    lockedAxis.current = null;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    if (!lockedAxis.current) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      lockedAxis.current = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
    }
    if (lockedAxis.current === "y") return;

    e.preventDefault();
    let next = startTranslate.current + deltaX;
    next = Math.min(0, Math.max(next, -REVEAL_WIDTH));
    setTranslateX(next);
  }

  function onTouchEnd() {
    setDragging(false);
    setTranslateX((t) => (t < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0));
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="absolute inset-y-0 right-0 flex items-stretch bg-crit"
        style={{ width: REVEAL_WIDTH }}
      >
        <button
          type="button"
          onClick={() => {
            setTranslateX(0);
            onDelete();
          }}
          className="w-full h-full flex flex-col items-center justify-center gap-1 text-white active:opacity-80"
        >
          <span className="text-lg">🗑️</span>
          <span className="text-xs font-semibold">Excluir</span>
        </button>
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
          touchAction: "pan-y",
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
}
