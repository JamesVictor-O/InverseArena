# Deployment Guide for Mantle Network

## Prerequisites

1. **Install Foundry**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Setup Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Get Testnet Tokens**
   - Get MNT from Mantle testnet faucet: https://faucet.testnet.mantle.xyz
   - Ensure you have enough for deployment gas fees

## Mantle Testnet Configuration

### Token Addresses (Update before deployment)

For Mantle Testnet, you'll need to update the actual token addresses in your `.env` file:

```bash
# Mantle Testnet Token Addresses (to be updated)
USDT0_ADDRESS=0x...  # Update with actual USDT0 testnet address
METH_ADDRESS=0x...   # Update with actual mETH testnet address
AAVE_POOL_ADDRESS=0x0000000000000000000000000000000000000000  # Can be zero for initial deployment
```

### Chainlink VRF Setup (Mantle Testnet)

1. Go to [Chainlink VRF](https://vrf.chain.link/)
2. Create a subscription on Mantle Testnet
3. Fund the subscription with LINK tokens
4. Get the coordinator address and key hash from [Chainlink docs](https://docs.chain.link/vrf/v2/subscription/supported-networks)

Update your `.env` file:
```bash
VRF_COORDINATOR=0x...  # Chainlink VRF Coordinator address on Mantle Testnet
VRF_SUBSCRIPTION_ID=1  # Your subscription ID
VRF_KEY_HASH=0x...     # Key hash for Mantle Testnet
```

## Deployment Steps

### 1. Compile Contracts

```bash
cd contract
forge build
```

### 2. Run Tests (Optional but Recommended)

```bash
forge test
```

### 3. Deploy to Mantle Testnet

```bash
# Deploy without verification (faster)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url mantle_testnet \
  --broadcast \
  --verify \
  --etherscan-api-key $MANTLE_API_KEY \
  -vvvv

# Or use the npm script
npm run deploy:testnet
```

### 4. Deployment Order

The script automatically deploys in the correct order:
1. **YieldVault** - Manages yield generation
2. **NFTAchievements** - NFT achievement system
3. **GameManager** - Core game logic
4. **Matchmaking** - Player matching system

### 5. Post-Deployment Setup

After deployment, you need to:

1. **Authorize GameManager to mint achievements:**
   ```bash
   # This is done automatically in the deployment script
   # But you can verify with:
   cast call $NFT_ACHIEVEMENTS_ADDRESS "authorizedMinters(address)(bool)" $GAME_MANAGER_ADDRESS
   ```

2. **Verify Contract Deployment:**
   - Check all contracts are deployed correctly
   - Verify contract code on Mantlescan
   - Check contract interactions

## Deployment Verification

### Check Deployment

```bash
# Get deployed contract addresses from the deployment output
# Example: check YieldVault
cast call $YIELD_VAULT_ADDRESS "USDT0()(address)"

# Check GameManager
cast call $GAME_MANAGER_ADDRESS "yieldVault()(address)"
```

### Verify on Mantlescan

1. Go to [Mantlescan Testnet](https://explorer.testnet.mantle.xyz)
2. Search for your contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Follow the verification wizard

Or use forge verify:

```bash
forge verify-contract \
  --chain-id 5001 \
  --num-of-optimizations 200 \
  --watch \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address)" $USDT0 $METH $AAVE $MNT) \
  --etherscan-api-key $MANTLE_API_KEY \
  --compiler-version v0.8.28 \
  0xYourContractAddress \
  contracts/YieldVault.sol:YieldVault
```

## Mainnet Deployment

For mainnet deployment:

1. Update token addresses in `.env` to mainnet addresses
2. Update VRF configuration for mainnet
3. Run deployment with mainnet RPC:

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url mantle_mainnet \
  --broadcast \
  --verify \
  --etherscan-api-key $MANTLE_API_KEY \
  -vvvv
```

Or use npm script:
```bash
npm run deploy:mainnet
```

## Troubleshooting

### Common Issues

1. **Insufficient Balance**
   - Ensure your wallet has enough MNT for gas fees
   - Check account balance: `cast balance $DEPLOYER_ADDRESS --rpc-url mantle_testnet`

2. **VRF Configuration**
   - Verify VRF subscription is funded with LINK
   - Check coordinator address is correct for Mantle
   - Ensure subscription ID is correct

3. **Token Addresses**
   - Verify token addresses are correct for the network
   - For testnet, you may need to deploy mock tokens first

4. **Verification Fails**
   - Ensure optimizer settings match (200 runs, via-ir)
   - Check compiler version matches (0.8.28)
   - Verify constructor arguments are correct

## Next Steps After Deployment

1. **Update Frontend Configuration**
   - Update contract addresses in frontend `.env`
   - Update network configuration
   - Test contract interactions

2. **Setup Monitoring**
   - Add contract addresses to monitoring tools
   - Setup event listeners
   - Configure alerts

3. **Security Audit**
   - Review deployed contracts
   - Check access controls
   - Verify emergency functions

4. **Documentation**
   - Update contract addresses in documentation
   - Document any deployment-specific configurations
   - Create user guides
