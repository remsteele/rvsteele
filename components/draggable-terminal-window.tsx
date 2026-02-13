"use client";

import { useRef, useState } from "react";

type Position = { x: number; y: number };

export function DraggableTerminalWindow({ children }: { children: React.ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<Position | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const stopDrag = () => {
    dragOffset.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDrag);
  };

  const onPointerMove = (event: PointerEvent) => {
    const frame = frameRef.current;
    const offset = dragOffset.current;
    if (!frame || !offset) return;

    const width = frame.offsetWidth;
    const height = frame.offsetHeight;
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);

    const x = Math.min(Math.max(0, event.clientX - offset.x), maxX);
    const y = Math.min(Math.max(0, event.clientY - offset.y), maxY);
    setPosition({ x, y });
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.top });
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDrag);
  };

  return (
    <>
      <div className="md:hidden h-[78vh] w-full max-w-[95vw] overflow-hidden rounded border border-[#202020] bg-[#0a0a0a] shadow-[0_0_40px_rgba(0,0,0,0.55)]">
        {children}
      </div>

      <div
        ref={frameRef}
        className={`hidden md:flex fixed z-10 h-[min(72vh,620px)] w-[min(92vw,920px)] flex-col overflow-hidden rounded-md border border-[#222] bg-[#0a0a0a] shadow-[0_22px_65px_rgba(0,0,0,0.8)] ${
          position ? "" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
        style={position ? { left: position.x, top: position.y } : undefined}
      >
        <div
          className="flex cursor-move items-center gap-2 border-b border-[#252525] bg-[#111] px-4 py-2 select-none"
          onPointerDown={startDrag}
        >
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
          <span className="ml-3 text-xs text-slate-400">remington@portfolio - zsh</span>
        </div>

        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </>
  );
}
