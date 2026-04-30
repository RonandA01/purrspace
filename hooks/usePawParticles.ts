"use client";

import { useState, useRef, useCallback } from "react";

export interface Particle {
  id: number;
  x: number;
  y: number;
  rot: number;
  scale: number;
}

/**
 * Custom hook that manages a burst of paw-print particles.
 * Call `burst()` on like; pass `particles` to your render.
 */
export function usePawParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);

  const burst = useCallback(() => {
    const newParticles: Particle[] = Array.from({ length: 6 }, () => ({
      id: nextId.current++,
      x: (Math.random() - 0.5) * 60,
      y: -(28 + Math.random() * 36),
      rot: Math.random() * 80 - 40,
      scale: 0.5 + Math.random() * 0.7,
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.some((n) => n.id === p.id))
      );
    }, 1000);
  }, []);

  const clear = useCallback(() => setParticles([]), []);

  return { particles, burst, clear };
}
