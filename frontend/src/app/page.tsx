import { Footer } from "@/components/LandingPage/Footer";
import { Hero } from "@/components/LandingPage/Hero";
import { HowToWin } from "@/components/LandingPage/HowToWin";
import { Navbar } from "@/components/LandingPage/Navbar";
import { StatsTicker } from "@/components/LandingPage/StatsTicker";
import { WinnersMarquee } from "@/components/LandingPage/WinnersMarquee";
import { LobbyGrid } from "@/components/LandingPage/LobbyGrid";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-white selection:bg-primary selection:text-background overflow-x-hidden">
      <Navbar />
      <main className="grow">
        <Hero />
        <StatsTicker />
        <LobbyGrid />
        <HowToWin />
        <WinnersMarquee />
      </main>
      <Footer />
    </div>
  );
}
