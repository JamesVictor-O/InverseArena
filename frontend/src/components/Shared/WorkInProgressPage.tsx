"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Construction } from "lucide-react";
import { Icon } from "@/components/Dashboard/Icon";

interface WorkInProgressPageProps {
  title?: string;
  description?: string;
}

export function WorkInProgressPage({
  title = "Work in Progress",
  description = "We're building something amazing. This feature will be available soon!",
}: WorkInProgressPageProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center">
        {/* Icon */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="size-32 lg:size-40 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center animate-pulse-slow">
            <Construction className="w-16 h-16 lg:w-20 lg:h-20 text-primary" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 lg:w-48 lg:h-48 rounded-full bg-primary/5 border border-primary/20 animate-pulse-slow [animation-delay:0.5s]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white mb-4">
          {title}
        </h1>

        {/* Description */}
        <p className="text-lg text-white/60 font-medium max-w-md mx-auto mb-12">
          {description}
        </p>

        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0s]" />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
          </div>
          <div className="w-64 h-1 mx-auto bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-linear-to-r from-primary via-accent to-secondary animate-pulse-slow" style={{ width: "60%" }} />
          </div>
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
            <Icon name="home" className="text-background" />
            Go to Dashboard
          </button>
        </div>

        {/* Decorative elements */}
        <div className="mt-16 flex items-center justify-center gap-2 text-white/20">
          <Icon name="stadia_controller" className="text-2xl" />
          <span className="text-sm font-bold">COMING SOON</span>
          <Icon name="stadia_controller" className="text-2xl" />
        </div>
      </div>
    </div>
  );
}
