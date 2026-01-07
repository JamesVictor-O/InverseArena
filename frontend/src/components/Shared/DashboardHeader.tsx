"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Dashboard/Icon";
import { useConnectActions } from "@/components/Connect/ConnectActions";

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

function getPageTitle(pathname: string): { title: string; subtitle?: string } {
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return { title: "Dashboard", subtitle: "Live Round #8492 • Ends in 00:45" };
  }
  if (pathname === "/dashboard/games") {
    return { title: "Game Market" };
  }
  if (pathname === "/dashboard/profile") {
    return { title: "Profile" };
  }
  if (pathname.startsWith("/dashboard/quick-play")) {
    return { title: "Quick Play" };
  }
  return { title: "Dashboard" };
}

export function DashboardHeader() {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const { walletAddress } = useConnectActions();
  const { title, subtitle } = getPageTitle(pathname);
  
  // Mock balance - replace with real data later
  const balance = walletAddress ? "$2,450.00" : "0.00";

  if (isDesktop) {
    return (
      <header className="h-16 px-8 flex items-center justify-between border-b border-white/5 bg-background/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black tracking-tight">{title}</h1>
          {subtitle && (
            <span className="text-xs text-white/50">{subtitle}</span>
          )}
        </div>
        <div
          id="wallet-pill"
          className="flex items-center gap-2 bg-surface border border-white/10 rounded-full pl-2 pr-4 py-1.5 shadow-lg"
        >
          <div className="flex items-center justify-center size-7 rounded-full bg-primary/20 text-primary">
            <Icon name="account_balance_wallet" className="text-[18px]" />
          </div>
          <span className="text-sm font-bold tracking-wide text-white">
            {balance}
          </span>
        </div>
      </header>
    );
  }

  // Mobile header
  return (
    <header className="flex items-center justify-between px-5 pt-10 pb-4 z-10 relative">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(0,238,255,0.18)]">
          <Icon name="stadia_controller" className="text-[20px]" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-black tracking-tight">
            INVERSE{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-accent to-secondary text-glow">
              ARENA
            </span>
          </div>
          <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
            {title}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          id="wallet-pill"
          className="flex items-center gap-2 bg-surface border border-white/10 rounded-full pl-2 pr-4 py-1.5 shadow-lg"
        >
          <div className="flex items-center justify-center size-6 rounded-full bg-primary/20 text-primary">
            <Icon name="account_balance_wallet" className="text-[16px]" />
          </div>
          <span className="text-sm font-bold tracking-wide text-white">
            {balance}
          </span>
        </div>
      </div>
    </header>
  );
}
