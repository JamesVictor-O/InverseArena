# Inverse Arena Contracts Setup Guide

## Quick Start

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Install Dependencies

```bash
# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0

# Install Chainlink contracts
forge install smartcontractkit/chainlink-brownie-contracts@v1.0.0

# Install Forge Std (for testing)
forge install foundry-rs/forge-std@v1.7.3
```

### 3. Configure Environment

Create a `.env` file in the `contract/` directory:

```env
PRIVATE_KEY=your_private_key_here
VRF_COORDINATOR=0x...  
VRF_SUBSCRIPTION_ID=123
VRF_KEY_HASH=0x...
MANTLE_API_KEY=your_mantle_api_key
BASE_API_KEY=your_base_api_key
```

### 4. Compile Contracts

```bash
forge build
```

### 5. Run Tests

```bash
forge test
```

## Chainlink VRF Setup

### For Mantle Testnet

1. Go to [Chainlink VRF](https://vrf.chain.link/)
2. Create a subscription
3. Fund the subscription with LINK tokens
4. Get the coordinator address and key hash from [Chainlink docs](https://docs.chain.link/vrf/v2/subscription/supported-networks)

### VRF Addresses (Mantle Testnet)
- Coordinator: Check Chainlink docs for latest address
- Key Hash: Check Chainlink docs for latest key hash

## Deployment Order

1. **InverseToken** - Deploy first (no dependencies)
2. **YieldVault** - Deploy second (no dependencies)
3. **NFTAchievements** - Deploy third (no dependencies)
4. **GameManager** - Deploy fourth (depends on all above)
5. **Matchmaking** - Deploy last (depends on GameManager)

## Post-Deployment Setup

After deploying all contracts:

1. Authorize GameManager to mint achievements:
   ```solidity
   nftAchievements.setAuthorizedMinter(gameManagerAddress, true);
   ```

2. Configure yield protocols in YieldVault:
   ```solidity
   yieldVault.updateProtocol(0, mETHProtocolAddress, true);
   yieldVault.updateProtocol(1, usdt0ProtocolAddress, true);
   ```

3. Set platform fee in GameManager:
   ```solidity
   gameManager.setPlatformFee(500); // 5%
   ```

## Testing Locally

```bash
# Run all tests
forge test

# Run with verbose output
forge test -vvv

# Run specific test
forge test --match-test testCreateQuickPlayGame

# Run with gas reporting
forge test --gas-report
```

## Network Configuration

Update `foundry.toml` with your network RPC URLs:

```toml
[rpc_endpoints]
mantle_testnet = "https://rpc.testnet.mantle.xyz"
mantle_mainnet = "https://rpc.mantle.xyz"
base_sepolia = "https://sepolia.base.org"
base_mainnet = "https://mainnet.base.org"
```

## Troubleshooting

### Compilation Errors

If you get import errors:
```bash
forge install --no-commit OpenZeppelin/openzeppelin-contracts@v5.0.0
```

### Test Failures

Make sure you have the correct VRF addresses configured for your test environment.

### Deployment Issues

- Ensure your wallet has enough native tokens for gas
- Verify all contract addresses are correct
- Check that VRF subscription is funded

## Next Steps

1. Write comprehensive tests
2. Set up CI/CD pipeline
3. Security audit
4. Deploy to testnet
5. Mainnet deployment
