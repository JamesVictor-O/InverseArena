"use client";

import * as React from "react";
import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const enablePrivy = process.env.NEXT_PUBLIC_ENABLE_PRIVY === "true";

  if (!enablePrivy) return children;

  if (!appId) {
    throw new Error(
      "Missing NEXT_PUBLIC_PRIVY_APP_ID. Set it in frontend/.env.local and restart `npm run dev`."
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
