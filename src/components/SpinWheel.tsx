"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { WHEEL_CATEGORIES, WHEEL_EMOJIS, WheelCategory } from "@/lib/types";
import { vibrate } from "@/lib/haptics";

// Roulette-style: alternating red/black, Wild Card in green
const SEGMENT_COLORS = [
  "#C41E3A",  // Funny Stories — red
  "#1A1A1A",  // Big Questions — black
  "#C41E3A",  // Guilty Pleasures — red
  "#1A1A1A",  // Hot Takes — black
  "#C41E3A",  // Fears & Peeves — red
  "#1A1A1A",  // Situationships — black
  "#C41E3A",  // Confessions — red
  "#1B5E32",  // Wild Card — green (the "0")
];

const SEGMENT_TEXT_COLORS = [
  "#FFF8F0",
  "#FFF8F0",
  "#FFF8F0",
  "#FFF8F0",
  "#FFF8F0",
  "#FFF8F0",
  "#FFF8F0",
  "#FFF8F0",
];

// Full labels split into lines for the wheel
const WHEEL_LINES: Record<WheelCategory, string[]> = {
  "Funny Stories": ["Funny", "Stories"],
  "Big Questions": ["Big", "Questions"],
  "Guilty Pleasures": ["Guilty", "Pleasures"],
  "Hot Takes": ["Hot", "Takes"],
  "Fears & Peeves": ["Fears & Pet", "Peeves"],
  "Confessions": ["Confessions"],
  "Situationships": ["Situation-", "ships"],
  "Wild Card": ["Wild", "Card"],
};

interface SpinWheelProps {
  onCategorySelected: (category: WheelCategory) => void;
  disabled?: boolean;
}

export default function SpinWheel({ onCategorySelected, disabled }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [cssTransition, setCssTransition] = useState(false);
  const [dragHintVisible, setDragHintVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Drag-to-spin refs
  const currentRotation = useRef(0);
  const isDragging = useRef(false);
  const lastTouchAngle = useRef(0);
  const touchHistory = useRef<{ rotation: number; time: number }[]>([]);
  const animFrameId = useRef(0);
  const isAnimating = useRef(false);

  // Refs for current values in event handlers (avoid stale closures)
  const isSpinningRef = useRef(false);
  const disabledRef = useRef(false);
  const onCategorySelectedRef = useRef(onCategorySelected);
  isSpinningRef.current = isSpinning;
  disabledRef.current = disabled || false;
  onCategorySelectedRef.current = onCategorySelected;

  const segmentAngle = 360 / WHEEL_CATEGORIES.length;

  const resolveCategory = useCallback((finalRotation: number): WheelCategory => {
    const normalizedAngle = ((finalRotation % 360) + 360) % 360;
    const pointerAngle = (360 - normalizedAngle) % 360;
    const index = Math.floor(pointerAngle / segmentAngle) % WHEEL_CATEGORIES.length;
    return WHEEL_CATEGORIES[index];
  }, [segmentAngle]);

  // Button spin (unchanged behaviour)
  const spin = useCallback(() => {
    if (isSpinning || disabled) return;

    vibrate(50);
    setIsSpinning(true);
    setCssTransition(true);

    const fullRotations = (3 + Math.floor(Math.random() * 3)) * 360;
    const randomOffset = Math.random() * 360;
    const newRotation = currentRotation.current + fullRotations + randomOffset;

    currentRotation.current = newRotation;
    setRotation(newRotation);

    setTimeout(() => {
      const category = resolveCategory(newRotation);
      console.log("[Wheel] Spin result:", { category });
      setIsSpinning(false);
      setCssTransition(false);
      vibrate([50, 30, 50]);
      onCategorySelectedRef.current(category);
    }, 4200);
  }, [isSpinning, disabled, resolveCategory]);

  // --- Drag-to-spin ---

  const getAngleFromCenter = useCallback((clientX: number, clientY: number): number => {
    const el = containerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  }, []);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (isSpinningRef.current || disabledRef.current || isAnimating.current) return;
    isDragging.current = true;
    lastTouchAngle.current = getAngleFromCenter(clientX, clientY);
    touchHistory.current = [{ rotation: currentRotation.current, time: Date.now() }];
    if (containerRef.current) containerRef.current.style.cursor = "grabbing";
  }, [getAngleFromCenter]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    const angle = getAngleFromCenter(clientX, clientY);
    let delta = angle - lastTouchAngle.current;
    // Normalize to [-180, 180] for angle wrapping
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    lastTouchAngle.current = angle;

    currentRotation.current += delta;
    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${currentRotation.current}deg)`;
    }

    const now = Date.now();
    touchHistory.current.push({ rotation: currentRotation.current, time: now });
    if (touchHistory.current.length > 5) {
      touchHistory.current = touchHistory.current.slice(-5);
    }
  }, [getAngleFromCenter]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (containerRef.current) containerRef.current.style.cursor = "";

    const history = touchHistory.current;
    if (history.length < 2) {
      setRotation(currentRotation.current);
      return;
    }

    const first = history[0];
    const last = history[history.length - 1];
    const dt = last.time - first.time;
    if (dt === 0) {
      setRotation(currentRotation.current);
      return;
    }

    let velocity = (last.rotation - first.rotation) / dt; // deg/ms

    // Too slow — not a real flick
    if (Math.abs(velocity) < 0.15) {
      setRotation(currentRotation.current);
      return;
    }

    // Cap velocity for max ~5s spin
    velocity = Math.sign(velocity) * Math.min(Math.abs(velocity), 2.0);

    setDragHintVisible(false);
    vibrate(50);
    setIsSpinning(true);
    isAnimating.current = true;

    const friction = 0.983;
    const stopThreshold = 0.01;
    let lastTime = performance.now();
    let vel = velocity;

    const animate = (time: number) => {
      const frameDt = Math.min(time - lastTime, 32);
      lastTime = time;

      vel *= Math.pow(friction, frameDt / 16);
      currentRotation.current += vel * frameDt;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentRotation.current}deg)`;
      }

      if (Math.abs(vel) > stopThreshold) {
        animFrameId.current = requestAnimationFrame(animate);
      } else {
        isAnimating.current = false;
        const finalRotation = currentRotation.current;
        setRotation(finalRotation);
        setIsSpinning(false);

        const category = resolveCategory(finalRotation);
        console.log("[Wheel] Drag spin result:", { category });
        vibrate([50, 30, 50]);
        onCategorySelectedRef.current(category);
      }
    };

    animFrameId.current = requestAnimationFrame(animate);
  }, [resolveCategory]);

  // Attach touch/mouse event listeners (non-passive for preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let mouseActive = false;

    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      handleDragEnd();
    };

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      mouseActive = true;
      handleDragStart(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!mouseActive) return;
      handleDragMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      if (!mouseActive) return;
      mouseActive = false;
      handleDragEnd();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  const size = 300;
  const center = size / 2;
  const radius = size / 2 - 4;

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  }

  function createSegmentPath(startAngle: number, endAngle: number) {
    const start = polarToCartesian(endAngle);
    const end = polarToCartesian(startAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  }

  function getTextPosition(index: number, radiusMultiplier: number) {
    const angle = index * segmentAngle + segmentAngle / 2 - 90;
    const rad = (angle * Math.PI) / 180;
    const textRadius = radius * radiusMultiplier;
    return {
      x: center + textRadius * Math.cos(rad),
      y: center + textRadius * Math.sin(rad),
      rotation: angle + 90,
    };
  }

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center select-none"
      style={{
        width: "min(70vw, 300px)",
        maxHeight: "100%",
        aspectRatio: "1",
        touchAction: "none",
        cursor: isSpinning ? "default" : "grab",
      }}
    >
      {/* Pointer at top */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
        <div
          className="w-0 h-0"
          style={{
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "20px solid #D4A845",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          }}
        />
      </div>

      {/* Wheel */}
      <div
        ref={wheelRef}
        className="w-full h-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: cssTransition
            ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
            : "none",
        }}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
          {/* Outer wooden rail ring */}
          <circle
            cx={center}
            cy={center}
            r={radius + 4}
            fill="none"
            stroke="#8B6914"
            strokeWidth="4"
          />
          {/* Inner gold ring */}
          <circle
            cx={center}
            cy={center}
            r={radius + 2}
            fill="none"
            stroke="#D4A845"
            strokeWidth="2"
          />
          {WHEEL_CATEGORIES.map((category, i) => {
            const startAngle = i * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            return (
              <path
                key={category}
                d={createSegmentPath(startAngle, endAngle)}
                fill={SEGMENT_COLORS[i]}
                stroke="#D4A845"
                strokeWidth="1.5"
              />
            );
          })}
          {WHEEL_CATEGORIES.map((category, i) => {
            const lines = WHEEL_LINES[category];
            const emojiPos = getTextPosition(i, 0.85);

            // For single-line labels, place at 0.62
            // For two-line labels, place lines at 0.64 and 0.56 (tighter spacing)
            const linePositions = lines.length === 1
              ? [getTextPosition(i, 0.62)]
              : [getTextPosition(i, 0.64), getTextPosition(i, 0.56)];

            return (
              <g key={category}>
                {/* Emoji */}
                <text
                  x={emojiPos.x}
                  y={emojiPos.y}
                  fontSize="13"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${emojiPos.rotation}, ${emojiPos.x}, ${emojiPos.y})`}
                >
                  {WHEEL_EMOJIS[category]}
                </text>
                {/* Label lines */}
                {lines.map((line, li) => {
                  const pos = linePositions[li];
                  return (
                    <text
                      key={li}
                      x={pos.x}
                      y={pos.y}
                      fill={SEGMENT_TEXT_COLORS[i]}
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${pos.rotation}, ${pos.x}, ${pos.y})`}
                    >
                      {line}
                    </text>
                  );
                })}
              </g>
            );
          })}
          {/* Roulette ball pocket dots at segment boundaries */}
          {WHEEL_CATEGORIES.map((_, i) => {
            const angle = i * segmentAngle - 90;
            const rad = (angle * Math.PI) / 180;
            const dotR = radius - 2;
            return (
              <circle
                key={`dot-${i}`}
                cx={center + dotR * Math.cos(rad)}
                cy={center + dotR * Math.sin(rad)}
                r="3"
                fill="#D4A845"
                opacity="0.6"
              />
            );
          })}
          {/* Center hub */}
          <circle cx={center} cy={center} r="30" fill="#0B1A0F" stroke="#D4A845" strokeWidth="2" />
        </svg>
      </div>

      {/* SPIN button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={spin}
        disabled={isSpinning || disabled}
        className="absolute font-display text-gold text-sm font-bold tracking-wider disabled:opacity-50"
        style={{ textShadow: "0 0 10px rgba(212, 168, 69, 0.5)" }}
      >
        {isSpinning ? "..." : "SPIN"}
      </motion.button>

      {/* Drag hint — disappears after first drag spin */}
      {dragHintVisible && !isSpinning && (
        <p className="absolute -bottom-5 left-0 right-0 text-center font-body text-cream/25 text-xs pointer-events-none">
          or drag to spin
        </p>
      )}
    </div>
  );
}
