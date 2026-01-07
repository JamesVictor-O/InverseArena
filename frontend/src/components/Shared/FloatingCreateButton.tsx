"use client";

import * as React from "react";
import { Icon } from "@/components/Dashboard/Icon";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

interface FloatingCreateButtonProps {
  onClick: () => void;
}

export function FloatingCreateButton({ onClick }: FloatingCreateButtonProps) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 z-40 size-16 rounded-full bg-primary text-background shadow-[0_0_30px_rgba(0,238,255,0.4)] hover:shadow-[0_0_40px_rgba(0,238,255,0.5)] border border-primary/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      aria-label="Create Arena"
    >
      <Icon name="add" fill className="text-[32px]" />
    </button>
  );
}
