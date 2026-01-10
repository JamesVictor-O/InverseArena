/**
 * Network utilities for Mantle Sepolia
 */

export const MANTLE_SEPOLIA = {
  chainId: 5003,
  name: "Mantle Sepolia",
  rpcUrl: "https://rpc.sepolia.mantle.xyz",
  explorerUrl: "https://explorer.sepolia.mantle.xyz",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18,
  },
} as const;

/**
 * Request to switch to Mantle Sepolia network
 */
export async function requestMantleSepoliaNetwork(): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ethereum = (window as any).ethereum;
  const chainId = `0x${MANTLE_SEPOLIA.chainId.toString(16)}`; // Convert to hex

  try {
    // Try to switch to the network
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
    return true;
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add the network
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId,
              chainName: MANTLE_SEPOLIA.name,
              nativeCurrency: MANTLE_SEPOLIA.nativeCurrency,
              rpcUrls: [MANTLE_SEPOLIA.rpcUrl],
              blockExplorerUrls: [MANTLE_SEPOLIA.explorerUrl],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Error adding network:", addError);
        return false;
      }
    }
    // User rejected the request
    if (switchError.code === 4001) {
      return false;
    }
    console.error("Error switching network:", switchError);
    return false;
  }
}

/**
 * Check if connected to Mantle Sepolia
 */
export async function isMantleSepolia(provider: any): Promise<boolean> {
  try {
    const network = await provider.getNetwork();
    return network.chainId === BigInt(MANTLE_SEPOLIA.chainId);
  } catch {
    return false;
  }
}
