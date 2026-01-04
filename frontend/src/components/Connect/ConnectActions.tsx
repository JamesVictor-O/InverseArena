"use client";

import React, { createContext, useContext, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";

type ConnectActions = {
  connectWallet: () => boolean | Promise<boolean>;
  isReady: boolean;
  isAuthenticated: boolean;
  walletAddress: string | null;
};

const ConnectActionsContext = createContext<ConnectActions | null>(null);

function useIsPrivyEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_PRIVY === "true";
}

function EnabledPrivyActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Privy SDK's hook surface is intentionally flexible; we only depend on a few optional fields here.
  const privy = usePrivy() as unknown as {
    ready: boolean;
    authenticated?: boolean;
    user?: unknown;
    login?: () => unknown;
    linkWallet?: () => unknown;
    link?: unknown;
  };

  const value = useMemo<ConnectActions>(() => {
    const isReady = Boolean(privy.ready);
    const isAuthenticated = Boolean(privy.authenticated);

    const userAny = privy.user as unknown as {
      wallet?: { address?: string };
      wallets?: Array<{ address?: string }>;
      linkedAccounts?: Array<{ type?: string; address?: string }>;
    } | null;

    const walletAddress: string | null =
      userAny?.wallet?.address ??
      userAny?.wallets?.[0]?.address ??
      userAny?.linkedAccounts?.find((a) => a?.type === "wallet")?.address ??
      null;

    return {
      connectWallet: () => {
        if (!privy.ready) {
          console.warn("[connect] Privy not ready yet (still initializing).");
          return false;
        }

        const authenticated = Boolean(privy.authenticated);

        try {
          if (!authenticated) {
            void privy.login?.();
            return true;
          }

          // If the user is already logged in, Privy expects you to link a wallet instead of logging in again.
          if (typeof privy.linkWallet === "function") {
            privy.linkWallet();
            return true;
          }

          // Fallbacks for alternate SDK shapes
          const linkAny = privy.link as unknown as
            | (() => unknown)
            | { wallet?: () => unknown }
            | undefined;

          if (typeof linkAny === "function") {
            linkAny();
            return true;
          }
          if (
            typeof linkAny === "object" &&
            typeof linkAny?.wallet === "function"
          ) {
            linkAny.wallet();
            return true;
          }

          console.warn(
            "[connect] Already logged in. No wallet-link helper found on usePrivy(); skipping."
          );
          return false;
        } catch (e) {
          console.error("[connect] Privy connect flow failed to start:", e);
          return false;
        }
      },
      isReady,
      isAuthenticated,
      walletAddress,
    };
  }, [privy]);

  return (
    <ConnectActionsContext.Provider value={value}>
      {children}
    </ConnectActionsContext.Provider>
  );
}

export function ConnectActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = useIsPrivyEnabled();

  if (enabled)
    return (
      <EnabledPrivyActionsProvider>{children}</EnabledPrivyActionsProvider>
    );

  const value: ConnectActions = {
    connectWallet: () => {
      // UI-only mode: keep it non-blocking but obvious.
      console.warn(
        "[connect] Privy is disabled. Set NEXT_PUBLIC_ENABLE_PRIVY=true and configure NEXT_PUBLIC_PRIVY_APP_ID to enable wallet connect."
      );
      return false;
    },
    isReady: false,
    isAuthenticated: false,
    walletAddress: null,
  };

  return (
    <ConnectActionsContext.Provider value={value}>
      {children}
    </ConnectActionsContext.Provider>
  );
}

export function useConnectActions() {
  const ctx = useContext(ConnectActionsContext);
  if (!ctx) {
    throw new Error(
      "useConnectActions must be used within <ConnectActionsProvider />"
    );
  }
  return ctx;
}
