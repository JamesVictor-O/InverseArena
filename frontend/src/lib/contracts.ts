/**
 * Contract addresses and configuration for Inverse Arena
 * Updated after deployment to Mantle Sepolia Testnet
 */

// Deployed contract addresses (Mantle Sepolia Testnet)
export const CONTRACT_ADDRESSES = {
  // Core contracts
  YIELD_VAULT: "0x15B9E263B6E896d4D8F0D9c89878678aa6abAdeC",
  NFT_ACHIEVEMENTS: "0x0115CA8539906db2d9a4beE36C64eA94a0d7Fa31",
  GAME_MANAGER: "0x284991966A8256521e72470E3B92E03E8aB8c1C3",
  MATCHMAKING: "0xd4B7fCecE89ABE7cAEd26aB34b548465ae05eE1B",

  // Token addresses (from deployment)
  USDT0: "0xc2B0D2A7e858F13B349843fF87dBF4EBF9227F49", // Mock USDT0
  METH: "0xF7602C048F8C7Cc5E8c514522D633eb9A16a3a1B", // Mock mETH
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 5003, // Mantle Sepolia Testnet
  name: "Mantle Sepolia",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.sepolia.mantle.xyz",
  explorerUrl: "https://explorer.sepolia.mantle.xyz",
} as const;

// Environment variable overrides (for different networks)
export const getContractAddresses = () => {
  return {
    YIELD_VAULT:
      process.env.NEXT_PUBLIC_YIELD_VAULT_ADDRESS ||
      CONTRACT_ADDRESSES.YIELD_VAULT,
    NFT_ACHIEVEMENTS:
      process.env.NEXT_PUBLIC_NFT_ACHIEVEMENTS_ADDRESS ||
      CONTRACT_ADDRESSES.NFT_ACHIEVEMENTS,
    GAME_MANAGER:
      process.env.NEXT_PUBLIC_GAME_MANAGER_ADDRESS ||
      CONTRACT_ADDRESSES.GAME_MANAGER,
    MATCHMAKING:
      process.env.NEXT_PUBLIC_MATCHMAKING_ADDRESS ||
      CONTRACT_ADDRESSES.MATCHMAKING,
    USDT0: process.env.NEXT_PUBLIC_USDT0_ADDRESS || CONTRACT_ADDRESSES.USDT0,
    METH: process.env.NEXT_PUBLIC_METH_ADDRESS || CONTRACT_ADDRESSES.METH,
  };
};
