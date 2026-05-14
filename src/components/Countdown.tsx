"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { vibrate } from "@/lib/haptics";

interface CountdownProps {
  onComplete: () => void;
  durationPerDigit?: number;
}

export default function Countdown({
  onComplete,
  durationPerDigit = 800,
}: CountdownProps) {
  const [value, setValue] = useState<number>(3);
  const onCompleteRef = useRef(onComplete);

  // Keep the latest onComplete reachable from the timer without re-running it.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    // Synchronising the displayed digit with a real timer (an external system) is
    // the legitimate use case for an effect; the lint rule fires on the first sync
    // setState even though the rest of the schedule is async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(3);
    vibrate(50);
    const t1 = setTimeout(() => {
      setValue(2);
      vibrate(50);
    }, durationPerDigit);
    const t2 = setTimeout(() => {
      setValue(1);
      vibrate(50);
    }, durationPerDigit * 2);
    const t3 = setTimeout(() => {
      onCompleteRef.current();
    }, durationPerDigit * 3);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [durationPerDigit]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[180px]">
      <AnimatePresence mode="wait">
        <motion.span
          key={value}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.6, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="font-display text-gold font-bold leading-none"
          style={{ fontSize: "clamp(8rem, 32vw, 12rem)" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
