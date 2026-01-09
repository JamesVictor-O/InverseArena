# Mantle Sepolia Testnet Configuration

## Network Details

- **Network Name**: Mantle Sepolia Testnet
- **RPC URL**: `https://rpc.sepolia.mantle.xyz`
- **Chain ID**: `5003`
- **Currency Symbol**: MNT
- **Block Explorer**: https://explorer.sepolia.mantle.xyz

## Getting Testnet Tokens

### Option 1: Mantle Sepolia Faucet
Visit the Mantle Sepolia testnet faucet to request testnet MNT tokens for deployment and testing.

### Option 2: Bridge from Sepolia
You can bridge testnet ETH from Sepolia to Mantle Sepolia using the official bridge.

## Adding Network to MetaMask

1. Open MetaMask
2. Click network dropdown → "Add Network" → "Add a network manually"
3. Enter the following details:
   - **Network Name**: Mantle Sepolia
   - **RPC URL**: `https://rpc.sepolia.mantle.xyz`
   - **Chain ID**: `5003`
   - **Currency Symbol**: MNT
   - **Block Explorer URL**: `https://explorer.sepolia.mantle.xyz`
4. Save the network

## Chainlink VRF on Mantle Sepolia

### Setup VRF Subscription

1. Go to [Chainlink VRF](https://vrf.chain.link/)
2. Connect your wallet (set to Mantle Sepolia network)
3. Create a new subscription on Mantle Sepolia
4. Fund the subscription with LINK tokens
5. Get the VRF coordinator address and key hash from [Chainlink docs](https://docs.chain.link/vrf/v2/subscription/supported-networks)

### VRF Configuration

Update your `.env` file with Mantle Sepolia VRF details:
```bash
VRF_COORDINATOR=0x... # Mantle Sepolia VRF Coordinator
VRF_SUBSCRIPTION_ID=1 # Your subscription ID
VRF_KEY_HASH=0x... # Key hash for Mantle Sepolia
```

## Token Addresses on Mantle Sepolia

For testnet deployment, you may need to:
1. Deploy mock ERC20 tokens first, OR
2. Use existing testnet tokens if available

### Mock Tokens

You can deploy simple mock tokens for testing:
- Mock USDT0 (6 decimals)
- Mock mETH (18 decimals)

These can be deployed using a simple ERC20 mock contract before deploying the main contracts.

## Deployment Commands

### Using the deployment script (Recommended)
```bash
cd contract
./scripts/deploy.sh sepolia
```

### Using Forge directly
```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url mantle_sepolia \
  --broadcast \
  --verify \
  --etherscan-api-key $MANTLE_API_KEY \
  -vvvv
```

### Using npm script
```bash
cd contract
npm run deploy:sepolia
```

## Verification

After deployment, verify contracts on Mantle Sepolia Explorer:
- **Explorer**: https://explorer.sepolia.mantle.xyz
- Contracts will be automatically verified if `--verify` flag is used

## Testing Contract Interactions

```bash
# Test contract calls on Mantle Sepolia
cast call $CONTRACT_ADDRESS "functionName()(returnType)" --rpc-url mantle_sepolia

# Send transactions
cast send $CONTRACT_ADDRESS "functionName(uint256)" 123 \
  --rpc-url mantle_sepolia \
  --private-key $PRIVATE_KEY
```

## Frontend Configuration

Update your frontend `.env.local`:
```bash
NEXT_PUBLIC_NETWORK=mantle-sepolia
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.mantle.xyz
NEXT_PUBLIC_CHAIN_ID=5003
NEXT_PUBLIC_EXPLORER_URL=https://explorer.sepolia.mantle.xyz
```

## Troubleshooting

### Issue: "Network not recognized"
- Ensure you've added Mantle Sepolia to MetaMask
- Verify Chain ID is 5003
- Check RPC URL is correct

### Issue: "Insufficient balance"
- Request tokens from Mantle Sepolia faucet
- Check your balance: `cast balance $ADDRESS --rpc-url mantle_sepolia`

### Issue: "VRF subscription not found"
- Verify you created the subscription on Mantle Sepolia (not mainnet)
- Ensure subscription is funded with LINK
- Check coordinator address matches Mantle Sepolia

## Resources

- **Mantle Docs**: https://docs.mantle.xyz
- **Mantle Sepolia Explorer**: https://explorer.sepolia.mantle.xyz
- **Chainlink VRF Docs**: https://docs.chain.link/vrf/v2/subscription/supported-networks
