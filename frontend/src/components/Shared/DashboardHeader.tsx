"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Dashboard/Icon";
import { useConnectActions } from "@/components/Connect/ConnectActions";
import { useGameManager } from "@/hooks/useGameManager";
import { Currency } from "@/lib/contract-types";

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
  const { getTokenBalance } = useGameManager();

  const [balance, setBalance] = React.useState<string>("0.00 USDT0");
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch USDT0 balance when wallet is connected
  React.useEffect(() => {
    if (!walletAddress) {
      setBalance("0.00 USDT0");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let intervalId: NodeJS.Timeout | null = null;
    let isFirstFetch = true;

    const fetchBalance = async (isInitial = false) => {
      // Only show loading on initial fetch
      if (isInitial) {
        setIsLoading(true);
      }

      try {
        const tokenBalance = await getTokenBalance(Currency.USDT0);

        if (!cancelled) {
          // Format balance with commas and appropriate decimal places
          const balanceNum = parseFloat(tokenBalance);

          // Use more decimal places for very small balances
          let formattedBalance: string;
          if (balanceNum === 0) {
            formattedBalance = "0.00";
          } else if (balanceNum < 0.01) {
            // For very small balances, show more precision
            formattedBalance = balanceNum.toLocaleString("en-US", {
              minimumFractionDigits: 4,
              maximumFractionDigits: 6,
            });
          } else if (balanceNum < 1) {
            formattedBalance = balanceNum.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            });
          } else {
            // For larger balances, standard 2 decimal places
            formattedBalance = balanceNum.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
          }

          setBalance(`${formattedBalance} USDT0`);
        }
      } catch (error) {
        console.error("Error fetching USDT0 balance:", error);
        // Don't reset to 0.00 on error - keep showing previous balance
        // This prevents flickering when there's a temporary network issue
        if (!cancelled && isFirstFetch) {
          // Only show error message on first failed fetch
          setBalance("Error");
        }
      } finally {
        if (!cancelled && isInitial) {
          setIsLoading(false);
          isFirstFetch = false;
        }
      }
    };

    // Initial fetch with a small delay to ensure wallet is ready
    const timeoutId = setTimeout(() => {
      fetchBalance(true); // Pass true for initial fetch

      // Refresh balance every 10 seconds (silently, without loading state)
      intervalId = setInterval(() => {
        if (walletAddress && !cancelled) {
          fetchBalance(false); // Pass false for subsequent fetches
        }
      }, 10000);
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [walletAddress, getTokenBalance]);

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
            {isLoading ? "..." : balance}
          </span>
        </div>
      </header>
    );
  }

  // Mobile header - fixed at top
  return (
    <header className="fixed top-0 left-0 right-0 flex items-center justify-between px-5 pt-10 pb-4 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
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
            {isLoading ? "..." : balance}
          </span>
        </div>
      </div>
    </header>
  );
}
