"use client";

import * as React from "react";
import type { OnboardingStep } from "./types";
import { Icon } from "./Icon";
import styles from "./dashboard.module.css";

interface OnboardingOverlayProps {
  step: OnboardingStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  /** id of the scroll container that contains the targets (defaults to "dashboard-scroll") */
  scrollContainerId?: string;
}

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
};

function getRelativeRect(targetRect: DOMRect, containerRect: DOMRect): Rect {
  const top = targetRect.top - containerRect.top;
  const left = targetRect.left - containerRect.left;
  const width = targetRect.width;
  const height = targetRect.height;
  return {
    top,
    left,
    width,
    height,
    bottom: top + height,
    right: left + width,
  };
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onSkip,
  scrollContainerId = "dashboard-scroll",
}) => {
  const [rect, setRect] = React.useState<Rect | null>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = React.useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return window.innerHeight;
  });

  React.useEffect(() => {
    let raf = 0;

    const updatePosition = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const targetEl = document.getElementById(step.targetId);
        if (!targetEl) return;

        const targetRect = targetEl.getBoundingClientRect();
        // Overlay will be fixed to viewport; treat viewport top/left as origin.
        setRect(getRelativeRect(targetRect, new DOMRect(0, 0, 0, 0)));
      });
    };

    const scrollEl = document.getElementById(scrollContainerId);

    updatePosition();
    const onResize = () => {
      setViewportHeight(window.innerHeight);
      updatePosition();
    };
    window.addEventListener("resize", onResize);
    scrollEl?.addEventListener("scroll", updatePosition, { passive: true });

    // Also update if layout shifts (fonts/images)
    const ro = new ResizeObserver(updatePosition);
    if (scrollEl) ro.observe(scrollEl);
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      scrollEl?.removeEventListener("scroll", updatePosition);
      ro.disconnect();
    };
  }, [step.targetId, scrollContainerId]);

  if (!rect) return null;

  const isWallet = step.targetId === "wallet-pill";
  const spotlightStyle: React.CSSProperties = {
    position: "absolute",
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    borderRadius: isWallet ? 9999 : 16,
    transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  // Tooltip placement: below if there’s room, else above.
  const tooltipGap = 20;
  const approxTooltipHeight = 220;
  const placeBelow =
    rect.bottom + tooltipGap + approxTooltipHeight < (viewportHeight || 0);
  const tooltipTop = placeBelow
    ? rect.bottom + tooltipGap
    : Math.max(16, rect.top - tooltipGap - approxTooltipHeight);

  const arrowTop = placeBelow ? -8 : undefined;
  const arrowBottom = placeBelow ? undefined : -8;
  const arrowRotation = placeBelow ? "rotate(45deg)" : "rotate(225deg)";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 overflow-hidden pointer-events-auto"
    >
      {/* spotlight cutout + ring */}
      <div
        style={spotlightStyle}
        className={`${styles.spotlightMask} ring-2 ring-primary ring-offset-4 ring-offset-transparent shadow-neon animate-pulse-slow pointer-events-none`}
      />

      {/* skip */}
      <button
        onClick={onSkip}
        className="absolute top-6 left-4 z-50 flex items-center gap-1.5 py-2 pr-3 pl-1 rounded-lg text-white/60 hover:text-white transition-colors group"
      >
        <div className="flex items-center justify-center size-6 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
          <Icon name="close" className="text-sm" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider">Skip</span>
      </button>

      {/* tooltip */}
      <div
        className="absolute w-full px-4 z-50 animate-fade-in"
        style={{
          top: tooltipTop,
          maxHeight: "calc(100% - 120px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="bg-[#162a2c]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          {/* arrow */}
          <div
            className="absolute size-4 bg-[#162a2c] border-l border-t border-white/10 z-10"
            style={{
              transform: arrowRotation,
              top: arrowTop,
              bottom: arrowBottom,
              left: rect.left + rect.width / 2 - 10,
            }}
          />

          <div className="flex flex-col gap-5 relative z-20">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-primary shadow-neon" />
                <span className="text-primary text-xs font-bold uppercase tracking-widest">
                  Step {currentStepIndex + 1} of {totalSteps}
                </span>
              </div>
              <Icon name={step.icon} className="text-white/20 text-xl" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                {step.title}
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStepIndex
                        ? "w-6 bg-primary shadow-neon"
                        : "w-1.5 bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={onNext}
                className="group flex items-center gap-2 bg-primary hover:bg-[#33f2ff] text-background px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-[0_0_15px_rgba(0,238,255,0.3)] hover:shadow-[0_0_25px_rgba(0,238,255,0.5)] active:scale-95"
              >
                <span>
                  {currentStepIndex === totalSteps - 1 ? "Finish" : "Next"}
                </span>
                <Icon
                  name="arrow_forward"
                  className="text-lg group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
