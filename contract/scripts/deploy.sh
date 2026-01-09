#!/bin/bash

# Inverse Arena Deployment Script for Mantle Network
# This script helps deploy all contracts to Mantle testnet/mainnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Network selection (default: sepolia)
NETWORK=${1:-sepolia}

if [ "$NETWORK" != "sepolia" ] && [ "$NETWORK" != "testnet" ] && [ "$NETWORK" != "mainnet" ]; then
    echo -e "${RED}Error: Network must be 'sepolia', 'testnet', or 'mainnet'${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Inverse Arena Deployment Script${NC}"
echo -e "${GREEN}Network: $NETWORK${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Check if .env or .env.local exists
if [ ! -f .env ] && [ ! -f .env.local ]; then
    echo -e "${RED}Error: Neither .env nor .env.local file found!${NC}"
    echo -e "${YELLOW}Please create .env or .env.local file with your values${NC}"
    exit 1
fi

# CRITICAL: forge script only reads .env file, not .env.local or exported vars
# So we need to ensure .env exists and has all required variables from .env.local
if [ -f .env.local ]; then
    echo -e "${YELLOW}Preparing .env file for forge script from .env.local...${NC}"
    # Backup existing .env if it exists
    [ -f .env ] && cp .env .env.backup.bak 2>/dev/null || true
    
    # Create merged .env with .env.local taking precedence
    if [ -f .env ]; then
        # Merge both files: .env.local values override .env
        # Use awk to deduplicate by key, keeping first occurrence (.env.local)
        (cat .env.local; cat .env) | awk -F'=' '!seen[$1]++' > .env.merged
        mv .env.merged .env
    else
        # If no .env exists, just copy .env.local
        cp .env.local .env
    fi
    echo -e "${GREEN}✓ .env file ready for forge script${NC}\n"
fi

# Load environment variables from .env and .env.local for bash script
# .env.local overrides .env if both exist
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
fi

# Validate required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set in .env or .env.local${NC}"
    exit 1
fi

# Check if custom RPC_URL is set in .env or .env.local (takes priority)
if [ -n "$RPC_URL" ]; then
    echo -e "${YELLOW}Using custom RPC URL from .env/.env.local${NC}"
    echo -e "RPC: $RPC_URL"
    # Try to get chain ID from RPC
    CHAIN_ID=$(cast chain-id --rpc-url $RPC_URL 2>/dev/null || echo "unknown")
    EXPLORER="${EXPLORER_URL:-https://explorer.sepolia.mantle.xyz}"
    echo -e "Chain ID: $CHAIN_ID"
    echo -e "Explorer: $EXPLORER\n"
elif [ "$NETWORK" = "sepolia" ]; then
    RPC_URL="https://rpc.sepolia.mantle.xyz"
    EXPLORER="https://explorer.sepolia.mantle.xyz"
    CHAIN_ID=5003
    
    echo -e "${YELLOW}Using Mantle Sepolia Testnet${NC}"
    echo -e "RPC: $RPC_URL"
    echo -e "Explorer: $EXPLORER"
    echo -e "Chain ID: $CHAIN_ID\n"
elif [ "$NETWORK" = "testnet" ]; then
    RPC_URL="https://rpc.testnet.mantle.xyz"
    EXPLORER="https://explorer.testnet.mantle.xyz"
    CHAIN_ID=5001
    
    echo -e "${YELLOW}Using Mantle Testnet${NC}"
    echo -e "RPC: $RPC_URL"
    echo -e "Explorer: $EXPLORER"
    echo -e "Chain ID: $CHAIN_ID\n"
else
    RPC_URL="https://rpc.mantle.xyz"
    EXPLORER="https://explorer.mantle.xyz"
    CHAIN_ID=5000
    
    echo -e "${YELLOW}Using Mantle Mainnet${NC}"
    echo -e "RPC: $RPC_URL"
    echo -e "Explorer: $EXPLORER\n"
fi

# Check balance
echo -e "${GREEN}Checking deployer balance...${NC}"
DEPLOYER_ADDRESS=$(cast wallet address $PRIVATE_KEY)
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL)
echo -e "Deployer: $DEPLOYER_ADDRESS"
echo -e "Balance: $(cast --to-unit $BALANCE ether) MNT\n"

if [ $(cast --to-unit $BALANCE wei) -lt 100000000000000000 ]; then
    echo -e "${RED}Warning: Low balance! You may need more MNT for deployment${NC}"
    if [ "$NETWORK" = "testnet" ]; then
        echo -e "${YELLOW}Get testnet tokens from: https://faucet.testnet.mantle.xyz${NC}"
    fi
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Compile contracts
echo -e "\n${GREEN}Compiling contracts...${NC}"
forge build

# Run tests (optional)
read -p "Run tests before deployment? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${GREEN}Running tests...${NC}"
    forge test || {
        echo -e "${RED}Tests failed! Aborting deployment.${NC}"
        exit 1
    }
fi

# Deploy contracts
echo -e "\n${GREEN}Deploying contracts...${NC}"
echo -e "${YELLOW}This may take a few minutes...${NC}\n"

forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key ${MANTLE_API_KEY:-} \
    -vvvv

# Restore original .env if backup exists (cleanup)
if [ -f .env.backup.bak ]; then
    mv .env.backup.bak .env
    echo -e "${YELLOW}Restored original .env file${NC}\n"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Verify contract addresses on ${EXPLORER}"
echo -e "2. Update frontend .env with contract addresses"
echo -e "3. Test contract interactions"
echo -e "4. Configure frontend to use deployed contracts\n"
