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
    entryFee: number;
    maxPlayers: number;
    isPrivate: boolean;
    additionalRules?: string;
  }) => {
    console.log("Create arena:", data);
    // TODO: Implement arena creation logic
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
