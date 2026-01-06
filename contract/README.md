# Inverse Arena Smart Contracts

Smart contracts for Inverse Arena - The Contrarian GameFi Protocol Where Minority Wins.

## 📁 Project Structure

```
contract/
├── contracts/
│   ├── interfaces/          # Contract interfaces
│   │   ├── IYieldVault.sol
│   │   └── INFTAchievements.sol
│   ├── GameManager.sol      # Core game logic
│   ├── YieldVault.sol       # RWA yield generation
│   ├── NFTAchievements.sol  # NFT achievements
│   └── Matchmaking.sol       # Player matchmaking
├── script/
│   └── Deploy.s.sol         # Deployment script
├── test/                    # Test files (to be added)
├── foundry.toml            # Foundry configuration
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js and pnpm (for workspace management)

### Installation

1. Install Foundry dependencies:

```bash
forge install OpenZeppelin/openzeppelin-contracts
forge install smartcontractkit/chainlink-brownie-contracts
```

2. Install Node.js dependencies:

```bash
pnpm install
```

### Configuration

1. Create a `.env` file in the `contract/` directory:

```env
PRIVATE_KEY=your_private_key_here
VRF_COORDINATOR=0x...  # Chainlink VRF Coordinator address
VRF_SUBSCRIPTION_ID=123  # Your Chainlink VRF subscription ID
VRF_KEY_HASH=0x...  # Chainlink VRF key hash
MANTLE_API_KEY=your_mantle_api_key
BASE_API_KEY=your_base_api_key
```

2. Update `foundry.toml` with your network configurations if needed.

## 📝 Contracts Overview

### GameManager.sol

Core game logic contract that manages:

- Game creation (Quick Play, Scheduled, Private)
- Player participation
- Round processing with Chainlink VRF
- Winner determination
- Prize distribution

**Key Functions:**

- `createQuickPlayGame()` - Create instant match game
- `createScheduledGame()` - Create scheduled tournament
- `createPrivateRoom()` - Create private game
- `joinGame()` - Join existing game
- `makeChoice()` - Make HEAD/TAIL choice for round

### YieldVault.sol

Manages yield generation from staked game funds:

- Deposits to yield protocols (mETH, USDT0)
- Tracks yield accumulation per game
- Distributes yield to winners

**Key Functions:**

- `depositForGame()` - Deposit funds for a game
- `getAccumulatedYield()` - Get yield for a game
- `distributeYield()` - Distribute yield to winner

### NFTAchievements.sol

NFT collection for player achievements:

- First Win
- 10-game Streak
- Tournament Champion
- Loyalty Tiers (Bronze, Silver, Gold, Platinum)
- And more...

**Key Functions:**

- `mintAchievement()` - Mint achievement NFT
- `getUserAchievements()` - Get user's achievements
- `hasAchievementType()` - Check if user has achievement

### Matchmaking.sol

Intelligent matchmaking system:

- Player queue management
- Automatic game creation when threshold reached
- Wait time estimation
- Entry fee matching

**Key Functions:**

- `addToQueue()` - Join matchmaking queue
- `removeFromQueue()` - Leave queue
- `matchPlayers()` - Manually trigger matching
- `estimateWaitTime()` - Get estimated wait time

## 🧪 Testing

Run tests:

```bash
forge test
```

Run tests with gas reporting:

```bash
forge test --gas-report
```

Run tests with coverage:

```bash
forge coverage
```

## 🚢 Deployment

### Deploy to Mantle Testnet

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url mantle_testnet \
  --broadcast \
  --verify
```

### Deploy to Mantle Mainnet

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url mantle_mainnet \
  --broadcast \
  --verify
```

### Deploy to Base

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url base_sepolia \
  --broadcast \
  --verify
```

## 💰 Token Usage

**Native Token (MNT)**: All game transactions use Mantle's native token (MNT). Entry fees, prizes, and yield are all denominated in MNT.

## 📋 Deployment Checklist

- [ ] Set up Chainlink VRF subscription
- [ ] Configure VRF coordinator addresses
- [ ] Set up yield protocol addresses (mETH, USDT0)
- [ ] Deploy contracts in order:
  1. YieldVault
  2. NFTAchievements
  3. GameManager
  4. Matchmaking
- [ ] Set up contract authorizations
- [ ] Configure platform fee
- [ ] Test on testnet
- [ ] Security audit
- [ ] Deploy to mainnet

## 🔒 Security Considerations

- All contracts use OpenZeppelin's battle-tested libraries
- ReentrancyGuard on all state-changing functions
- Access control with Ownable pattern
- Chainlink VRF for provably random outcomes
- Platform fee capped at 10%
- Emergency withdrawal functions for owner

## 📚 Additional Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Chainlink VRF](https://docs.chain.link/vrf/v2/introduction)
- [Mantle Network Docs](https://docs.mantle.xyz/)

## 🤝 Contributing

1. Create a feature branch
2. Write tests for new functionality
3. Ensure all tests pass
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
