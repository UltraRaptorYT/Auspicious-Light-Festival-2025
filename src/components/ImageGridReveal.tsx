"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImageGridRevealProps = {
  src: string;
  alt?: string;

  rows?: number;
  cols?: number;

  /** Controlled reveal state (optional). Length should be rows * cols */
  revealed?: boolean[];

  /** Called whenever a cell is toggled (works for controlled mode) */
  onRevealChange?: (next: boolean[], toggledIndex: number) => void;

  /** Initial state for uncontrolled mode */
  defaultRevealed?: boolean[];
};

export function ImageGridReveal({
  src,
  alt = "Grid image",
  rows = 6,
  cols = 3,
  revealed: revealedProp,
  onRevealChange,
  defaultRevealed,
}: ImageGridRevealProps) {
  const totalCells = rows * cols;

  // --- Internal state (for uncontrolled mode) ---
  const [internalRevealed, setInternalRevealed] = useState<boolean[]>(() => {
    if (defaultRevealed && defaultRevealed.length === totalCells) {
      return defaultRevealed;
    }
    return Array(totalCells).fill(false);
  });

  const revealed = useMemo(
    () =>
      revealedProp && revealedProp.length === totalCells
        ? revealedProp
        : internalRevealed,
    [revealedProp, internalRevealed, totalCells]
  );

  const isControlled = revealedProp !== undefined;

  const toggleCell = (index: number) => {
    const next = [...revealed];
    next[index] = !next[index];

    if (isControlled) {
      onRevealChange?.(next, index);
    } else {
      setInternalRevealed(next);
      onRevealChange?.(next, index); // still notify parent if they care
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-xl aspect-3/6 overflow-hidden rounded-xl">
        {/* Base image (single image) */}
        <Image src={src} alt={alt} fill className="object-cover" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {Array.from({ length: totalCells }).map((_, i) => (
            <div
              key={i}
              // onClick={() => toggleCell(i)}
              className={cn(
                "w-full h-full border transition-colors rounded-none flex items-center justify-center",
                "border-black/40 bg-white hover:bg-white text-black",
                revealed[i] &&
                  "bg-transparent border-transparent hover:bg-transparent"
              )}
            >
              {!revealed[i] && i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
