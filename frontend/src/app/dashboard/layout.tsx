"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/Shared/Sidebar";
import { DashboardHeader } from "@/components/Shared/DashboardHeader";
import { FloatingCreateButton } from "@/components/Shared/FloatingCreateButton";
import { CreateArenaModal } from "@/components/Dashboard/CreateArenaModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleCreateArena = (data: {
    name?: string;
    currency: number;
    entryFee: number;
    maxPlayers: number;
    isPrivate: boolean;
    additionalRules?: string;
  }) => {
    console.log("Create arena:", data);
    // TODO: Call contract function based on currency:
    // - Currency.USDT0: createQuickPlayGameUSDT0(entryFee, maxPlayers)
    // - Currency.METH: createQuickPlayGameMETH(entryFee, maxPlayers)
    // - Currency.MNT: createQuickPlayGame(entryFee, maxPlayers)
    // - If isPrivate: createPrivateRoom(currency, entryFee, maxPlayers)
  };

  return (
    <>
      <Sidebar onCreateClick={() => setCreateModalOpen(true)}>
        <DashboardHeader />
        {children}
      </Sidebar>
      <FloatingCreateButton onClick={() => setCreateModalOpen(true)} />
      <CreateArenaModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateArena}
      />
    </>
  );
}
