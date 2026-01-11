"use client";

import React, { useState, useCallback } from "react";
import { Sidebar } from "@/components/Shared/Sidebar";
import { DashboardHeader } from "@/components/Shared/DashboardHeader";
import { FloatingCreateButton } from "@/components/Shared/FloatingCreateButton";
import { CreateArenaModal } from "@/components/Dashboard/CreateArenaModal";
import { StakeModal } from "@/components/Dashboard/StakeModal";
import { useGameManager } from "@/hooks/useGameManager";
import { useConnectActions } from "@/components/Connect/ConnectActions";
import { Currency } from "@/lib/contract-types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [stakeModalOpen, setStakeModalOpen] = useState(false);
  const { createGame, isLoading, error, getCreatorStake, stakeAsCreator } = useGameManager();
  const { walletAddress, connectWallet } = useConnectActions();

  // Check stake status and open appropriate modal
  const handleCreateClick = useCallback(async () => {
    // If wallet not connected, connect first
    if (!walletAddress) {
      const connected = await connectWallet();
      if (!connected) return;
      // Wait a bit for wallet to connect
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
      // Check if user has staked
      const stakeInfo = await getCreatorStake();
      const hasStake = stakeInfo?.hasStaked ?? false;

      if (!hasStake) {
        // User hasn't staked - open StakeModal directly
        setStakeModalOpen(true);
      } else {
        // User has staked - open CreateArenaModal
        setCreateModalOpen(true);
      }
    } catch (err) {
      console.error("Error checking stake:", err);
      // On error, assume no stake and show StakeModal
      setStakeModalOpen(true);
    }
  }, [walletAddress, connectWallet, getCreatorStake]);

  const handleStake = useCallback(async (amount: number) => {
    const success = await stakeAsCreator(amount);
    if (success) {
      setStakeModalOpen(false);
      // After successful stake, open CreateArenaModal
      setCreateModalOpen(true);
    }
  }, [stakeAsCreator]);

  const handleCreateArena = async (data: {
    name?: string;
    currency: Currency;
    entryFee: number;
    maxPlayers: number;
    isPrivate: boolean;
    additionalRules?: string;
  }) => {
    try {
      console.log("Creating game with data:", data);

      // For now, we'll use Quick Play mode
      // TODO: Support private rooms with createPrivateRoom function
      const gameId = await createGame({
        currency: data.currency,
        entryFee: data.entryFee,
        maxPlayers: data.maxPlayers,
        name: data.name,
      });

      if (gameId && gameId !== "pending") {
        console.log("Game created successfully! Game ID:", gameId);
        // Close modal on success
        setCreateModalOpen(false);
        // TODO: Navigate to the game page
        // router.push(`/arena/${gameId}`);
      } else if (gameId === "pending") {
        // Transaction succeeded but gameId not extracted - still close modal
        console.log("Game creation transaction confirmed, gameId pending");
        setCreateModalOpen(false);
      } else {
        throw new Error(
          "Failed to create game. Please check your wallet and try again."
        );
      }
    } catch (err) {
      console.error("Error creating game:", err);
      const message =
        err instanceof Error ? err.message : "Failed to create game";
      // Re-throw to let modal handle the error display
      throw new Error(message);
    }
  };

  return (
    <>
      <Sidebar onCreateClick={handleCreateClick}>
        <DashboardHeader />
        {children}
      </Sidebar>
      <FloatingCreateButton onClick={handleCreateClick} />
      <StakeModal
        open={stakeModalOpen}
        onClose={() => setStakeModalOpen(false)}
        onStake={handleStake}
        minStake={30} // MIN_CREATOR_STAKE = 30 USDT0
      />
      <CreateArenaModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateArena}
      />
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-white/10 rounded-2xl p-6">
            <div className="text-white font-bold text-center">
              Creating game...
            </div>
            <div className="mt-4 text-white/70 text-sm text-center">
              Please confirm the transaction in your wallet
            </div>
          </div>
        </div>
      )}
    </>
  );
}
