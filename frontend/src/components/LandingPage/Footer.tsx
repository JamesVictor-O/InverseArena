import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-20">
          <div className="max-w-xs">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center text-primary">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L2 22h20L12 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">INVERSE ARENA</h2>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              The first elimination arena where the minority takes it all. Built
              on Solana for the next generation of gamers.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
            <div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                Game
              </h4>
              <ul className="flex flex-col gap-4 text-sm text-gray-500 font-medium">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Play Now
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Leaderboard
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Rules
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                Legal
              </h4>
              <ul className="flex flex-col gap-4 text-sm text-gray-500 font-medium">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Smart Contract Audit
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                Social
              </h4>
              <ul className="flex flex-col gap-4 text-sm text-gray-500 font-medium">
                <li>
                  <a
                    href="#"
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    Discord{" "}
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        strokeWidth={2}
                      />
                    </svg>
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    Twitter / X{" "}
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        strokeWidth={2}
                      />
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 text-center">
          <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
            © 2023 Inverse Arena. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
