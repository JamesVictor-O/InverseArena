# Inverse Arena Deployment Guide

## Quick Start

### 1. Prerequisites

- **Foundry Installed**: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **Wallet with MNT**: For Mantle Sepolia testnet, get tokens from the Mantle Sepolia faucet
- **VRF Subscription**: Create and fund a Chainlink VRF subscription
- **Mantle RPC Access**: Network RPC URLs are in `foundry.toml`

### 2. Environment Setup

```bash
cd contract
cp .env.example .env
# Edit .env with your values
```

Required `.env` variables:

```bash
PRIVATE_KEY=your_private_key_without_0x_prefix
VRF_COORDINATOR=0x... # Chainlink VRF Coordinator on Mantle
VRF_SUBSCRIPTION_ID=1 # Your VRF subscription ID
VRF_KEY_HASH=0x... # Key hash for Mantle network

# Token Addresses (update with actual Mantle addresses)
USDT0_ADDRESS=0x...
METH_ADDRESS=0x...
AAVE_POOL_ADDRESS=0x0000000000000000000000000000000000000000 # Can be zero initially

# API Keys for verification
MANTLE_API_KEY=your_api_key_for_verification
```

### 3. Deploy to Mantle Sepolia Testnet

#### Option A: Using the deployment script (Recommended)

```bash
cd contract
./scripts/deploy.sh sepolia
```

#### Option B: Manual deployment

```bash
cd contract

# Compile
forge build

# Run tests (optional but recommended)
forge test

# Deploy
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url mantle_sepolia \
  --broadcast \
  --verify \
  --etherscan-api-key $MANTLE_API_KEY \
  -vvvv
```

#### Option C: Using npm scripts

```bash
cd contract
npm run deploy:sepolia
```

### 4. Deployment Output

After deployment, you'll see output like:

```
=== Deployment Summary ===
YieldVault: 0x...
NFTAchievements: 0x...
GameManager: 0x...
Matchmaking: 0x...
```

**Save these addresses!** You'll need them for frontend integration.

### 5. Verify Deployment

#### Check on Mantlescan

1. Go to https://explorer.sepolia.mantle.xyz (Mantle Sepolia Explorer)
2. Search for each contract address
3. Verify contracts are deployed and verified

#### Test Contract Interactions

```bash
# Check YieldVault
cast call $YIELD_VAULT_ADDRESS "USDT0()(address)" --rpc-url mantle_sepolia

# Check GameManager
cast call $GAME_MANAGER_ADDRESS "yieldVault()(address)" --rpc-url mantle_sepolia

# Check NFTAchievements
cast call $NFT_ACHIEVEMENTS_ADDRESS "name()(string)" --rpc-url mantle_sepolia
```

### 6. Post-Deployment Configuration

#### Verify Authorizations

The deployment script automatically:

- ✅ Authorizes GameManager to mint achievements
- ✅ Sets up all contract relationships

You can verify:

```bash
# Check if GameManager is authorized to mint
cast call $NFT_ACHIEVEMENTS_ADDRESS \
  "authorizedMinters(address)(bool)" \
  $GAME_MANAGER_ADDRESS \
  --rpc-url mantle_sepolia

# Should return: true
```

#### Configure YieldVault Protocols (if needed)

If you need to enable/disable protocols or update APY:

```bash
# Enable USDT0 protocol (should already be enabled)
cast send $YIELD_VAULT_ADDRESS \
  "updateProtocol(uint8,address,bool,uint256,string)" \
  1 \
  $USDT0_ADDRESS \
  true \
  500 \
  "USDT0 Yield-Bearing Stablecoin" \
  --rpc-url mantle_sepolia \
  --private-key $PRIVATE_KEY

# Update APY for mETH
cast send $YIELD_VAULT_ADDRESS \
  "updateAPY(uint8,uint256)" \
  0 \
  400 \
  --rpc-url mantle_sepolia \
  --private-key $PRIVATE_KEY
```

### 7. Frontend Integration

#### Update Frontend Configuration

1. Create or update `frontend/.env.local`:

```bash
NEXT_PUBLIC_NETWORK=mantle-sepolia
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.mantle.xyz
NEXT_PUBLIC_CHAIN_ID=5003

# Contract Addresses (from deployment output)
NEXT_PUBLIC_GAME_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_YIELD_VAULT_ADDRESS=0x...
NEXT_PUBLIC_NFT_ACHIEVEMENTS_ADDRESS=0x...
NEXT_PUBLIC_MATCHMAKING_ADDRESS=0x...

# Token Addresses
NEXT_PUBLIC_USDT0_ADDRESS=0x...
NEXT_PUBLIC_METH_ADDRESS=0x...

# VRF Configuration
NEXT_PUBLIC_VRF_COORDINATOR=0x...
NEXT_PUBLIC_VRF_SUBSCRIPTION_ID=1
```

2. Update contract ABIs:

```bash
# Copy ABIs from contract output to frontend
cp contract/out/GameManager.sol/GameManager.json frontend/src/contracts/
cp contract/out/YieldVault.sol/YieldVault.json frontend/src/contracts/
cp contract/out/NFTAchievements.sol/NFTAchievements.json frontend/src/contracts/
cp contract/out/Matchmaking.sol/Matchmaking.json frontend/src/contracts/
```

3. Test frontend connection:

```bash
cd frontend
npm install
npm run dev
```

## Deployment Checklist

### Pre-Deployment

- [ ] Foundry installed and up to date
- [ ] `.env` file configured with all required values
- [ ] Wallet has sufficient MNT for deployment (testnet: ~0.1 MNT)
- [ ] VRF subscription created and funded with LINK
- [ ] Contracts compiled successfully (`forge build`)
- [ ] All tests passing (`forge test`)

### Deployment

- [ ] Deployment script executed successfully
- [ ] All 4 contracts deployed (YieldVault, NFTAchievements, GameManager, Matchmaking)
- [ ] Contracts verified on Mantlescan
- [ ] Contract addresses saved

### Post-Deployment

- [ ] Authorizations verified (GameManager can mint achievements)
- [ ] Contract interactions tested
- [ ] Frontend `.env.local` updated with contract addresses
- [ ] Frontend ABIs updated
- [ ] Frontend tested and working

## Troubleshooting

### Common Issues

#### 1. Insufficient Balance

**Error**: `execution reverted: insufficient funds`

**Solution**:

- Check balance: `cast balance $DEPLOYER_ADDRESS --rpc-url mantle_sepolia`
- Get testnet tokens from Mantle Sepolia faucet if needed

#### 2. VRF Configuration Error

**Error**: `Invalid VRF coordinator` or `Invalid subscription`

**Solution**:

- Verify VRF coordinator address is correct for Mantle network
- Ensure subscription ID exists and is funded
- Check key hash matches the network

#### 3. Contract Verification Fails

**Error**: `Contract verification failed`

**Solution**:

- Ensure optimizer settings match (200 runs, via-ir)
- Check compiler version matches (0.8.28)
- Verify constructor arguments are correct
- Try manual verification on Mantlescan

#### 4. Authorization Errors

**Error**: `Not authorized to mint`

**Solution**:

- Verify `setAuthorizedMinter` was called in deployment
- Check authorization: `cast call $NFT_ACHIEVEMENTS_ADDRESS "authorizedMinters(address)(bool)" $GAME_MANAGER_ADDRESS`

#### 5. Token Address Issues

**Error**: `Invalid token address` or token transfers failing

**Solution**:

- Verify token addresses are correct for the network
- For testnet, you may need to deploy mock tokens first
- Check token contracts exist on Mantlescan

## Mainnet Deployment

When ready for mainnet:

1. **Update Token Addresses**: Use actual mainnet addresses
2. **Update VRF Config**: Use mainnet VRF coordinator and subscription
3. **Security Audit**: Complete security audit before mainnet
4. **Deploy**:
   ```bash
   ./scripts/deploy.sh mainnet
   # OR
   npm run deploy:mainnet
   ```

## Next Steps After Deployment

1. **Monitor Contracts**: Set up monitoring for contract events
2. **Update Documentation**: Document contract addresses and configurations
3. **Test Thoroughly**: Test all game flows on testnet
4. **Gather Feedback**: Collect user feedback before mainnet
5. **Security Review**: Consider formal security audit before mainnet

## Support

- **Mantle Docs**: https://docs.mantle.xyz
- **Chainlink VRF**: https://docs.chain.link/vrf
- **Foundry Docs**: https://book.getfoundry.sh
- **Issues**: Open an issue on GitHub
