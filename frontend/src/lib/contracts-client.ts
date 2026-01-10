/**
 * Contract client utilities for interacting with Inverse Arena contracts
 * Uses Privy's embedded wallet or connected wallet
 */

import { getContractAddresses } from "./contracts";
import {
  GameManagerABIArray,
  YieldVaultABIArray,
  NFTAchievementsABIArray,
  MatchmakingABIArray,
} from "./abis";
// Note: Remove viem import if not using viem
// import type { Address } from "viem";
type Address = string;

// Contract address getter
export const getAddresses = () => getContractAddresses();

// Contract ABIs
export const CONTRACT_ABIS = {
  GameManager: GameManagerABIArray,
  YieldVault: YieldVaultABIArray,
  NFTAchievements: NFTAchievementsABIArray,
  Matchmaking: MatchmakingABIArray,
} as const;

/**
 * Get contract configuration for a given contract name
 */
export const getContractConfig = (contractName: keyof typeof CONTRACT_ABIS) => {
  const addresses = getAddresses();
  const addressMap: Record<keyof typeof CONTRACT_ABIS, Address> = {
    GameManager: addresses.GAME_MANAGER as Address,
    YieldVault: addresses.YIELD_VAULT as Address,
    NFTAchievements: addresses.NFT_ACHIEVEMENTS as Address,
    Matchmaking: addresses.MATCHMAKING as Address,
  };

  return {
    address: addressMap[contractName],
    abi: CONTRACT_ABIS[contractName],
  };
};

/**
 * Helper to format contract addresses for display
 */
export const formatAddress = (address: string, chars = 4): string => {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/**
 * Helper to get explorer URL for an address
 */
export const getExplorerUrl = (address: string): string => {
  return `https://explorer.sepolia.mantle.xyz/address/${address}`;
};
