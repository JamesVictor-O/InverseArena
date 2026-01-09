# Mantle Network Token Addresses

## Mantle Mainnet Addresses

### Native Token
- **MNT**: Native token (0x0000... for native transfers)

### Yield-Bearing Tokens
- **USDT0**: [To be updated with actual mainnet address]
  - Official USDT0 on Mantle mainnet
  - Contract: TBD
  
- **mETH**: [To be updated with actual mainnet address]
  - Mantle Staked ETH
  - Contract: TBD

### DeFi Protocols
- **Aave V3 Pool**: [To be updated with actual mainnet address]
  - Aave V3 Lending Pool on Mantle
  - Contract: TBD

- **Ondo USDY**: [To be updated if available]
  - Ondo Finance USDY token
  - Contract: TBD

## Mantle Testnet Addresses

For testnet deployment, you may need to deploy mock tokens first, or use testnet versions:

### Testnet Token Addresses (Update as needed)
- **USDT0**: Use mock token or testnet USDT0 if available
- **mETH**: Use mock token or testnet mETH if available
- **Aave Pool**: Can be set to address(0) for initial deployment

## Chainlink VRF Addresses

### Mantle Mainnet
- **VRF Coordinator**: [Check Chainlink docs](https://docs.chain.link/vrf/v2/subscription/supported-networks)
- **Key Hash**: [Check Chainlink docs](https://docs.chain.link/vrf/v2/subscription/supported-networks)

### Mantle Testnet
- **VRF Coordinator**: [Check Chainlink docs](https://docs.chain.link/vrf/v2/subscription/supported-networks)
- **Key Hash**: [Check Chainlink docs](https://docs.chain.link/vrf/v2/subscription/supported-networks)

## Getting Testnet Tokens

1. **MNT Testnet Tokens**:
   - Faucet: https://faucet.testnet.mantle.xyz
   - Request testnet MNT for deployment

2. **LINK Tokens** (for VRF):
   - Get from Chainlink faucet or buy on testnet
   - Needed to fund VRF subscription

## Updating Addresses

1. Update `.env` file with actual addresses
2. For testnet, you can deploy mock ERC20 tokens if needed
3. Verify addresses on Mantlescan before deploying

## Mock Tokens for Testing

For initial testing on testnet, you can deploy simple mock ERC20 tokens:

```solidity
// Simple ERC20 Mock
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint8 decimals) ERC20(name, symbol) {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

Deploy these mocks first, then use their addresses in the deployment script.
