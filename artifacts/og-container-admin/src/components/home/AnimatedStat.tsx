import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface AnimatedStatProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  duration?: number;
}

export function AnimatedStat({ value, suffix = "", prefix = "", label, duration = 2000 }: AnimatedStatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    
    let startTime: number;
    let animationFrame: number;

    const updateValue = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function: easeOutQuart
      const easeOut = 1 - Math.pow(1 - percentage, 4);
      const currentVal = Math.floor(easeOut * value);
      
      setDisplayValue(currentVal);

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(updateValue);
      }
    };

    animationFrame = requestAnimationFrame(updateValue);

    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, value, duration]);

  return (
    <div ref={ref} className="flex flex-col items-center text-center space-y-2 p-6 glass-panel rounded-2xl group hover:border-accent/50 transition-colors duration-500">
      <div className="text-4xl md:text-5xl font-heading font-bold text-foreground group-hover:text-accent transition-colors duration-500">
        {prefix}{displayValue.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
        {label}
      </div>
    </div>
  );
}
