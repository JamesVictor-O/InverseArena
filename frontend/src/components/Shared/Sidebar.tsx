"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
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

export function Sidebar({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  const handleNavClick = (label: string) => {
    switch (label) {
      case "Lobby":
        router.push("/dashboard");
        break;
      case "Games":
        router.push("/dashboard/games");
        break;
      case "Rank":
        router.push("/rank");
        break;
      case "Profile":
        router.push("/dashboard/profile");
        break;
      case "Settings":
        router.push("/settings");
        break;
      default:
        break;
    }
  };

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="fixed left-0 top-0 h-screen w-72 shrink-0 border-r border-white/5 bg-surface/20 backdrop-blur-xl overflow-y-auto">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-white/5 sticky top-0 bg-surface/20 backdrop-blur-xl z-10">
          <div className="size-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(0,238,255,0.18)]">
            <span className="font-black">N</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-black tracking-tight">
              INVERSE{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-accent to-secondary text-glow">
                ARENA
              </span>
            </div>
            <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
              dashboard
            </div>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {[
            { icon: "home", label: "Lobby", path: "/dashboard" },
            { icon: "stadia_controller", label: "Games", path: "/dashboard/games" },
            { icon: "leaderboard", label: "Rank", path: "/rank" },
            { icon: "person", label: "Profile", path: "/dashboard/profile" },
            { icon: "settings", label: "Settings", path: "/settings" },
          ].map((item) => {
            const isActive =
              pathname === item.path ||
              (item.path === "/dashboard" && pathname === "/");
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.label)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-colors ${
                  isActive
                    ? "bg-white/5 text-primary border border-primary/20"
                    : "text-white/70 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <span className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon
                    name={item.icon}
                    fill={isActive}
                    className="text-[20px]"
                  />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 ml-72">{children}</div>
    </div>
  );
}
