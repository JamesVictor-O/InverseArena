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
# Properly handle comments, quotes, and special characters
load_env_file() {
    local file=$1
    if [ -f "$file" ]; then
        # Read file line by line, handling comments and empty lines
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip empty lines and lines starting with #
            [[ -z "$line" ]] && continue
            [[ "$line" =~ ^[[:space:]]*# ]] && continue
            
            # Remove inline comments (everything after #)
            # Simple approach: remove # and everything after it
            line="${line%%#*}"
            
            # Trim whitespace
            line=$(echo "$line" | xargs)
            
            # Skip if line is now empty after comment removal
            [[ -z "$line" ]] && continue
            
            # Check if line contains =
            if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
                local key="${BASH_REMATCH[1]}"
                local value="${BASH_REMATCH[2]}"
                
                # Trim whitespace from key and value
                key=$(echo "$key" | xargs)
                value=$(echo "$value" | xargs)
                
                # Remove quotes if present (both single and double)
                value="${value#\"}"
                value="${value%\"}"
                value="${value#\'}"
                value="${value%\'}"
                
                # Export if key is not empty
                if [[ -n "$key" ]]; then
                    export "$key=$value"
                fi
            fi
        done < "$file"
    fi
}

# Load .env first, then .env.local (which will override)
load_env_file .env
load_env_file .env.local

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

# Ask about verification
SKIP_VERIFY=${SKIP_VERIFY:-false}
if [ -z "$MANTLE_API_KEY" ]; then
    echo -e "${YELLOW}Warning: MANTLE_API_KEY not set. Verification will be skipped.${NC}"
    SKIP_VERIFY=true
else
    read -p "Skip contract verification? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        SKIP_VERIFY=true
    fi
fi

# Deploy contracts
echo -e "\n${GREEN}Deploying contracts...${NC}"
echo -e "${YELLOW}This may take a few minutes...${NC}\n"

# Build forge script command
FORGE_CMD="forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast -vvvv"

if [ "$SKIP_VERIFY" = "false" ] && [ -n "$MANTLE_API_KEY" ]; then
    FORGE_CMD="$FORGE_CMD --verify --etherscan-api-key $MANTLE_API_KEY"
    echo -e "${GREEN}Contract verification enabled${NC}\n"
else
    echo -e "${YELLOW}Contract verification disabled${NC}\n"
fi

# Execute deployment
$FORGE_CMD

# Extract deployment addresses from broadcast file
echo -e "\n${GREEN}Extracting deployment addresses...${NC}"
BROADCAST_FILE=$(find broadcast/Deploy.s.sol -name "run-latest.json" 2>/dev/null | head -1)

if [ -n "$BROADCAST_FILE" ]; then
    # Try to extract addresses using jq if available, otherwise use grep
    if command -v jq &> /dev/null; then
        YIELD_VAULT=$(jq -r '.transactions[] | select(.contractName == "YieldVault") | .contractAddress' "$BROADCAST_FILE" 2>/dev/null)
        NFT_ACHIEVEMENTS=$(jq -r '.transactions[] | select(.contractName == "NFTAchievements") | .contractAddress' "$BROADCAST_FILE" 2>/dev/null)
        GAME_MANAGER=$(jq -r '.transactions[] | select(.contractName == "GameManager") | .contractAddress' "$BROADCAST_FILE" 2>/dev/null)
        MATCHMAKING=$(jq -r '.transactions[] | select(.contractName == "Matchmaking") | .contractAddress' "$BROADCAST_FILE" 2>/dev/null)
    else
        # Fallback: extract from forge output or use grep
        YIELD_VAULT=$(grep -o "YieldVault deployed at: 0x[a-fA-F0-9]\{40\}" "$BROADCAST_FILE" 2>/dev/null | grep -o "0x[a-fA-F0-9]\{40\}" | head -1)
        NFT_ACHIEVEMENTS=$(grep -o "NFTAchievements deployed at: 0x[a-fA-F0-9]\{40\}" "$BROADCAST_FILE" 2>/dev/null | grep -o "0x[a-fA-F0-9]\{40\}" | head -1)
        GAME_MANAGER=$(grep -o "GameManager deployed at: 0x[a-fA-F0-9]\{40\}" "$BROADCAST_FILE" 2>/dev/null | grep -o "0x[a-fA-F0-9]\{40\}" | head -1)
        MATCHMAKING=$(grep -o "Matchmaking deployed at: 0x[a-fA-F0-9]\{40\}" "$BROADCAST_FILE" 2>/dev/null | grep -o "0x[a-fA-F0-9]\{40\}" | head -1)
    fi
    
    # Save addresses to file
    DEPLOYMENT_FILE="deployment-addresses-$(date +%Y%m%d-%H%M%S).txt"
    cat > "$DEPLOYMENT_FILE" << EOF
# Inverse Arena Deployment Addresses
# Network: $NETWORK
# Deployed: $(date)
# Deployer: $DEPLOYER_ADDRESS

YIELD_VAULT_ADDRESS=$YIELD_VAULT
NFT_ACHIEVEMENTS_ADDRESS=$NFT_ACHIEVEMENTS
GAME_MANAGER_ADDRESS=$GAME_MANAGER
MATCHMAKING_ADDRESS=$MATCHMAKING

# Frontend .env variables
NEXT_PUBLIC_YIELD_VAULT_ADDRESS=$YIELD_VAULT
NEXT_PUBLIC_NFT_ACHIEVEMENTS_ADDRESS=$NFT_ACHIEVEMENTS
NEXT_PUBLIC_GAME_MANAGER_ADDRESS=$GAME_MANAGER
NEXT_PUBLIC_MATCHMAKING_ADDRESS=$MATCHMAKING
EOF
    
    echo -e "${GREEN}✓ Deployment addresses saved to: $DEPLOYMENT_FILE${NC}"
    echo -e "\n${YELLOW}Contract Addresses:${NC}"
    [ -n "$YIELD_VAULT" ] && echo -e "  YieldVault:        $YIELD_VAULT"
    [ -n "$NFT_ACHIEVEMENTS" ] && echo -e "  NFTAchievements:   $NFT_ACHIEVEMENTS"
    [ -n "$GAME_MANAGER" ] && echo -e "  GameManager:       $GAME_MANAGER"
    [ -n "$MATCHMAKING" ] && echo -e "  Matchmaking:       $MATCHMAKING"
    echo
fi

# Restore original .env if backup exists (cleanup)
if [ -f .env.backup.bak ]; then
    mv .env.backup.bak .env
    echo -e "${YELLOW}Restored original .env file${NC}\n"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Verify contract addresses on ${EXPLORER}"
if [ -n "$YIELD_VAULT" ]; then
    echo -e "   YieldVault: ${EXPLORER}/address/${YIELD_VAULT}"
fi
if [ -n "$GAME_MANAGER" ]; then
    echo -e "   GameManager: ${EXPLORER}/address/${GAME_MANAGER}"
fi
echo -e "2. Copy addresses from $DEPLOYMENT_FILE to frontend .env"
echo -e "3. Test contract interactions"
echo -e "4. Configure frontend to use deployed contracts\n"

