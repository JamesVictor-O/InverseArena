"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft } from "lucide-react";
import { Icon } from "@/components/Dashboard/Icon";

export function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <h1 className="text-[120px] lg:text-[180px] font-black leading-none text-transparent bg-clip-text bg-linear-to-r from-primary via-accent to-secondary text-glow">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 lg:w-48 lg:h-48 rounded-full bg-primary/10 border-2 border-primary/30 animate-pulse-slow" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4 mb-12">
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
            Arena Not Found
          </h2>
          <p className="text-lg text-white/60 font-medium max-w-md mx-auto">
            The arena you're looking for has been eliminated or doesn't exist.
            Time to return to the lobby.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 px-6 h-12 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-8 h-12 rounded-xl bg-primary text-background font-black hover:bg-primary-hover transition-all shadow-[0_0_25px_rgba(0,238,255,0.3)]"
          >
            <Home className="w-5 h-5" />
            Return to Lobby
          </button>
        </div>

        {/* Decorative elements */}
        <div className="mt-16 flex items-center justify-center gap-2 text-white/20">
          <Icon name="stadia_controller" className="text-2xl" />
          <span className="text-sm font-bold">INVERSE ARENA</span>
          <Icon name="stadia_controller" className="text-2xl" />
        </div>
      </div>
    </div>
  );
}
