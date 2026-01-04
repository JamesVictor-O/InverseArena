"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { WelcomeModal } from "./WelcomeModal";
import { EmailAuth } from "./EmailAuth";

export interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnectWallet?: () => boolean | Promise<boolean>;
  onContinueEmail?: (email: string) => void;
  onGuest?: () => void;
}

type Step = "welcome" | "email";

function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  open,
  onClose,
  onConnectWallet,
  onContinueEmail,
  onGuest,
}) => {
  const [step, setStep] = useState<Step>("welcome");
  const [notice, setNotice] = useState<string | null>(null);
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) {
      setStep("welcome");
      setNotice(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const content = useMemo(() => {
    if (step === "email") {
      return (
        <EmailAuth
          onBack={() => setStep("welcome")}
          onComplete={(email) => {
            onContinueEmail?.(email);
            onClose();
          }}
        />
      );
    }

    return (
      <WelcomeModal
        onContinueEmail={() => setStep("email")}
        onConnectWallet={async () => {
          setNotice(null);
          try {
            const ok = await onConnectWallet?.();
            if (ok === false) {
              setNotice(
                "Wallet connect isn’t enabled yet. Set NEXT_PUBLIC_ENABLE_PRIVY=true and restart the dev server."
              );
              return;
            }
            onClose();
          } catch {
            setNotice("Wallet connect failed to start. Check console for details.");
          }
        }}
        onGuest={() => {
          onGuest?.();
          onClose();
        }}
        notice={notice}
      />
    );
  }, [onClose, onConnectWallet, onContinueEmail, onGuest, step]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] animate-fade-in">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative">
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-gray-200 hover:text-white hover:border-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {content}
        </div>
      </div>
    </div>
  );
};

