#!/bin/bash

# Inverse Arena Deployment Script for Mantle Network
# Usage: ./deploy.sh [network]
# Networks: sepolia (default), testnet, mainnet

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

# Simple: use .env.local if it exists, otherwise .env
if [ -f .env.local ]; then
    echo -e "${YELLOW}Using .env.local for forge script...${NC}"
    cp .env.local .env
elif [ ! -f .env ]; then
    echo -e "${RED}Error: .env or .env.local file not found!${NC}"
    exit 1
fi

# Set RPC URL
if [ -n "$RPC_URL" ]; then
    RPC_URL="$RPC_URL"
elif [ "$NETWORK" = "sepolia" ]; then
    RPC_URL="https://rpc.sepolia.mantle.xyz"
    EXPLORER="https://explorer.sepolia.mantle.xyz"
elif [ "$NETWORK" = "testnet" ]; then
    RPC_URL="https://rpc.testnet.mantle.xyz"
    EXPLORER="https://explorer.testnet.mantle.xyz"
else
    RPC_URL="https://rpc.mantle.xyz"
    EXPLORER="https://explorer.mantle.xyz"
fi

echo -e "${YELLOW}RPC: $RPC_URL${NC}\n"

# Check balance
echo -e "${GREEN}Checking deployer balance...${NC}"
PRIVATE_KEY=$(grep "^PRIVATE_KEY=" .env | cut -d'=' -f2 | tr -d '"; ')
DEPLOYER_ADDRESS=$(cast wallet address $PRIVATE_KEY)
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL)
echo -e "Deployer: $DEPLOYER_ADDRESS"
echo -e "Balance: $(cast --to-unit $BALANCE ether) MNT\n"

# Compile
echo -e "${GREEN}Compiling contracts...${NC}"
forge build

# Deploy
echo -e "\n${GREEN}Deploying contracts...${NC}"

# Build forge command
FORGE_CMD="forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast -vvvv"

# Add verification if API key is set
MANTLE_API_KEY=$(grep "^MANTLE_API_KEY=" .env 2>/dev/null | cut -d'=' -f2 | tr -d '"; ' || echo "")
if [ -n "$MANTLE_API_KEY" ]; then
    FORGE_CMD="$FORGE_CMD --verify --etherscan-api-key $MANTLE_API_KEY"
    echo -e "${YELLOW}Contract verification enabled${NC}"
else
    echo -e "${YELLOW}Contract verification skipped (no MANTLE_API_KEY)${NC}"
fi

$FORGE_CMD

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"
