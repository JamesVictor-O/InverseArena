
export const CONTRACT_ADDRESSES = {
  // Core contracts
  YIELD_VAULT: "0xB47E02e88d10751Ca6FA79EbcD85fAd4a619a815",
  NFT_ACHIEVEMENTS: "0x3ff2eba8f98587a20a49805bfc2bf5d220a77611",
  GAME_MANAGER: "0x495989595bb1a6c3a6acd2b36a91a0739154fb6b",
  MATCHMAKING: "0xea395fb4831028a3ad91a106281f5f8284cbabda",

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

