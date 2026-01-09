# Finding Token Addresses on Mantle Sepolia Testnet

## How to Get mETH and USDT0 Token Addresses

### Option 1: Check Official Mantle Documentation

1. **Visit Mantle Docs**: https://docs.mantle.xyz
2. **Check Token Addresses**: Look for "Token Addresses" or "Testnet Tokens" section
3. **Mantle Sepolia Specific**: Check if there's a Sepolia testnet section

### Option 2: Use Mantle Sepolia Block Explorer

1. **Go to Explorer**: https://explorer.sepolia.mantle.xyz
2. **Search for Tokens**:
   - Search for "mETH" or "Mantle Staked ETH"
   - Search for "USDT0"
   - Look for verified token contracts
3. **Check Token Contracts**: Click on token addresses to verify they're official

### Option 3: Check Mantle Community Resources

1. **Discord**: Join Mantle Discord and ask in developer channel
2. **GitHub**: Check Mantle GitHub repos for testnet deployments
3. **Telegram**: Join Mantle developer community

### Option 4: Deploy Mock Tokens (Recommended for Testing)

If official testnet tokens don't exist, deploy mock tokens for testing:

```bash
# Deploy mock tokens
cd contract
forge script script/DeployMockTokens.s.sol:DeployMockTokens \
  --rpc-url mantle_sepolia \
  --broadcast \
  -vvvv
```

After deployment, update your `.env`:

```bash
USDT0_ADDRESS=0x... # Mock USDT0 address from deployment
METH_ADDRESS=0x... # Mock mETH address from deployment
```

## Using Mock Tokens

### Deploy Mock Tokens Script

We've created a script to deploy mock tokens:

```bash
forge script script/DeployMockTokens.s.sol:DeployMockTokens \
  --rpc-url mantle_sepolia \
  --broadcast \
  -vvvv
```

This will:

- Deploy Mock USDT0 (6 decimals, 1M supply)
- Deploy Mock mETH (18 decimals, 1M supply)
- Print addresses to use in `.env`

### Mint Tokens to Test Accounts

After deploying mocks, you can mint tokens:

```bash
# Mint USDT0 to an address
cast send $USDT0_ADDRESS \
  "mint(address,uint256)" \
  0xYourAddress \
  1000000000000 \
  --rpc-url mantle_sepolia \
  --private-key $PRIVATE_KEY

# Mint mETH to an address (18 decimals)
cast send $METH_ADDRESS \
  "mint(address,uint256)" \
  0xYourAddress \
  1000000000000000000 \
  --rpc-url mantle_sepolia \
  --private-key $PRIVATE_KEY
```

## Checking if Tokens Exist on Mantle Sepolia

### Using cast command:

```bash
# Check if a token contract exists and is valid ERC20
cast call 0xTokenAddress "name()(string)" --rpc-url mantle_sepolia
cast call 0xTokenAddress "symbol()(string)" --rpc-url mantle_sepolia
cast call 0xTokenAddress "decimals()(uint8)" --rpc-url mantle_sepolia
```

### Using Explorer:

1. Go to https://explorer.sepolia.mantle.xyz
2. Paste the token address
3. Check if contract is verified
4. Look at "Token Transfers" tab to see if it's active

## Recommended Approach

For **development and testing**:

1. **Deploy mock tokens first** using `DeployMockTokens.s.sol`
2. **Use mock addresses** in your `.env` file
3. **Deploy main contracts** with mock token addresses
4. **Test your contracts** with mock tokens

For **production/mainnet**:

1. **Use official token addresses** from Mantle documentation
2. **Verify addresses** on Mantlescan mainnet
3. **Double-check** before deployment

## Quick Reference

### Mantle Mainnet (for reference):

- **mETH**: `0xcDA86A272531e8640cD7F1a92c01839911B90bb0` (mainnet only)
- **USDT0**: Check official Mantle docs

### Mantle Sepolia Testnet:

- **mETH**: Deploy mock or check official docs
- **USDT0**: Deploy mock or check official docs
- **MNT**: Native token (no address needed)

## Deploy Mock Tokens Now

```bash
cd contract

# Make sure .env has PRIVATE_KEY set
forge script script/DeployMockTokens.s.sol:DeployMockTokens \
  --rpc-url mantle_sepolia \
  --broadcast \
  -vvvv

# Copy the addresses from output and add to .env
```

Then update `.env`:

```bash
USDT0_ADDRESS=0x... # From mock deployment output
METH_ADDRESS=0x... # From mock deployment output
AAVE_POOL_ADDRESS=0x0000000000000000000000000000000000000000 # Can be zero for now
```
