import React from "react";

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
}

interface StepTimelineProps {
  title: string;
  subtitle?: string;
  steps: Step[];
}

export function StepTimeline({ title, subtitle, steps }: StepTimelineProps) {
  return (
    <div className="w-full space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h3 className="text-3xl md:text-4xl font-heading font-bold">{title}</h3>
        {subtitle && <p className="text-muted-foreground text-lg leading-relaxed">{subtitle}</p>}
      </div>

      <div className="relative">
        {/* Mobile vertical connector */}
        <div
          className="absolute left-6 top-0 bottom-0 w-px md:hidden"
          style={{
            background: "linear-gradient(to bottom, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.5), hsl(var(--primary) / 0.3))"
          }}
        />

        {/* Desktop horizontal connector */}
        <div
          className="hidden md:block absolute top-12 left-[10%] right-[10%] h-px"
          style={{
            background: "linear-gradient(to right, transparent, hsl(var(--primary) / 0.2) 10%, hsl(var(--accent) / 0.45) 50%, hsl(var(--primary) / 0.2) 90%, transparent)"
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4 relative z-10">
          {steps.map((step, idx) => (
            <div key={idx} className="flex md:flex-col items-start md:items-center relative group">
              {/* Icon circle */}
              <div
                className="w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-xl mb-0 md:mb-6 shrink-0 transition-all duration-400 z-10 relative overflow-hidden border"
                style={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = "hsl(var(--accent))"
                  el.style.boxShadow = "0 0 0 1px hsl(var(--accent) / 0.2), 0 0 20px hsl(var(--accent) / 0.25)"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = "hsl(var(--border))"
                  el.style.boxShadow = "0 4px 16px hsl(0 0% 0% / 0.12)"
                }}
              >
                <step.icon
                  className="w-5 h-5 md:w-8 md:h-8 text-muted-foreground group-hover:text-accent transition-colors duration-400"
                />
                {/* Step number badge */}
                <div
                  className="absolute -top-1 -right-1 md:top-0 md:right-0 w-5 h-5 md:w-6 md:h-6 rounded-full text-[10px] md:text-xs font-bold flex items-center justify-center z-20"
                  style={{
                    background: "hsl(var(--accent))",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 0 10px hsl(var(--accent) / 0.4)"
                  }}
                >
                  {idx + 1}
                </div>
              </div>

              {/* Text */}
              <div className="ml-6 md:ml-0 md:text-center flex-1 pt-1 md:pt-0">
                <h4 className="text-base md:text-lg font-heading font-bold mb-2 group-hover:text-accent transition-colors duration-300">
                  {step.title}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
