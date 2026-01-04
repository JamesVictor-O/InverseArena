
# 🎮 INVERSE ARENA

## The Contrarian GameFi Protocol Where Minority Wins

[![Mantle Network](https://img.shields.io/badge/Built%20on-Mantle-blue)](https://mantle.xyz)


**Inverse Arena** is a revolutionary blockchain-based elimination game where going against the crowd is the winning strategy. Players stake assets, make binary choices, and the minority survives each round. The last player standing claims the entire prize pool plus accumulated yield deployed on mantel and base.

---

## 🎯 The Problem

### Current GameFi Landscape Challenges

1. **Predictable Gameplay**: Most crypto games follow the "majority wins" model, making outcomes predictable and boring
2. **No Real Value Accrual**: Player stakes sit idle without generating returns
3. **Poor User Retention**: Players join, play once, and never return due to:
   - Long waiting times for games to start
   - Lack of social engagement
   - No progression systems
   - Zero incentive to return
4. **Unsustainable Tokenomics**: Most GameFi projects collapse due to poor economic design
5. **Limited RWA Integration**: GameFi hasn't leveraged the power of Real-World Assets and yield generation

### The "Waiting Room Problem" 
The #1 killer of multiplayer blockchain games: **A player joins a pool expecting 10 participants, but only 2 have joined. The player leaves frustrated and never returns.**

---

## 💡 The Solution

**Inverse Arena** solves these challenges through innovative game mechanics, intelligent matchmaking, and RWA-backed yield generation.

### Core Innovation: Contrarian Gameplay
- **Minority Survives**: Each round, players choose HEAD or TAIL. The minority group advances.
- **Strategic Depth**: Players must predict what others will choose and do the opposite
- **Psychological Warfare**: Creates intense game theory dynamics

### Smart Matchmaking System
We eliminate the waiting room problem through multiple game modes:

#### 1. **Quick Play** (Instant Action)
- Dynamic pool sizing (4-20 players)
- Intelligent matchmaking algorithm
- Average wait time: <30 seconds
- Games auto-start when minimum threshold reached

#### 2. **Scheduled Tournaments** (Guaranteed Start)
- Games launch every hour at fixed times
- Pre-registration with countdown timer
- Larger prize pools
- Community hype building

#### 3. **Private Rooms** (Social Play)
- Create custom games for friends
- Adjustable parameters (entry fee, pool size)
- Spectator mode enabled

#### 4. **Progressive Entry**
- Games start with 4 players minimum
- Others can join during Round 1 (with slight premium)
- Keeps momentum going

### RWA Integration & Yield Generation
- Staked funds automatically deposited into Mantle's yield-generating protocols (mETH, USDT0)
- Prize pool grows during gameplay from accumulated yield
- Winners receive: Original stakes + Yield + Platform rewards

### Token Economics & Retention
**$INVERSE Token Utility:**
- Entry fee discounts (up to 30% off)
- Access to VIP tournaments
- Governance rights (vote on new features)
- Staking rewards (earn while you wait)

**User Retention Mechanics:**
- **Daily Quests**: Complete challenges for rewards
- **Seasonal Passes**: Battle pass style progression
- **NFT Achievements**: Mint badges for milestones
- **Leaderboards**: Global rankings with weekly prizes
- **Referral System**: Earn 10% of friends' entry fees
- **Loyalty Tiers**: Bronze → Silver → Gold → Platinum benefits

---

## 🏗️ Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    INVERSE ARENA ECOSYSTEM                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   Frontend DApp  │────────▶│  Mantle Network  │
│   (Next.js)      │         │   (Layer 2)      │
└──────────────────┘         └──────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
            ┌───────▼───────┐ ┌──────▼──────┐ ┌───────▼────────┐
            │ Game Contract │ │Yield Vault  │ │Token Contract  │
            │   (Core)      │ │  Contract   │ │   ($INVERSE)   │
            └───────────────┘ └─────────────┘ └────────────────┘
                    │                 │
            ┌───────▼───────┐ ┌──────▼──────┐
            │ Chainlink VRF │ │ RWA Protocol│
            │  (Randomness) │ │  Integration│
            └───────────────┘ └─────────────┘
```

### Smart Contract Architecture

#### 1. **GameManager.sol** (Core Game Logic)
```solidity
// Key Functions:
- createQuickPlayGame(uint256 entryFee)
- createScheduledGame(uint256 startTime, uint256 entryFee, uint256 maxPlayers)
- createPrivateRoom(uint256 entryFee, uint256 maxPlayers)
- joinGame(uint256 gameId)
- makeChoice(uint256 gameId, Choice choice) // HEAD or TAIL
- processRound(uint256 gameId)
- claimWinnings(uint256 gameId)
```

**Key Features:**
- Dynamic pool sizing
- Multi-game mode support
- Automated round processing
- Fair elimination algorithm

#### 2. **YieldVault.sol** (RWA Integration)
```solidity
// Key Functions:
- depositToYield(uint256 amount, address protocol)
- withdrawFromYield(uint256 amount)
- distributeYield(uint256 gameId)
- getAccumulatedYield(uint256 gameId)
```

**Integrated Protocols:**
- Mantle Staked ETH (mETH)
- USDT0 (Yield-bearing stablecoin)
- Other Mantle DeFi protocols

#### 3. **InverseToken.sol** ($INVERSE)
```solidity
// Key Functions:
- stake(uint256 amount)
- unstake(uint256 amount)
- getStakingRewards()
- governanceVote(uint256 proposalId, bool support)
```

**Token Distribution:**
- 40% - Community Rewards & Incentives
- 20% - Liquidity Provision
- 15% - Team & Development (2-year vesting)
- 15% - Ecosystem Growth Fund
- 10% - Private Sale & Strategic Partners

#### 4. **NFTAchievements.sol**
```solidity
// Mint badges for:
- First win
- 10-game streak
- Tournament champion
- Loyalty milestones
```

#### 5. **Matchmaking.sol**
```solidity
// Intelligent queue system:
- addToQueue(address player, GameMode mode)
- matchPlayers()
- estimateWaitTime()
```

### Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS + shadcn/ui
- Wagmi + Viem (Wallet connection)
- React Query (State management)

**Smart Contracts:**
- Solidity 0.8.24
- Hardhat (Development)
- OpenZeppelin (Security)
- Chainlink VRF (Randomness)

**Backend/Indexing:**
- The Graph (Event indexing)
- IPFS (Metadata storage)
- Node.js (Off-chain services)

**Blockchain:**
- Mantle Network (Layer 2)
- Mantle SDK integration
- Low gas fees for frequent transactions

---

## 🎮 How It Works

### Game Flow

```
1. ENTRY
   └─▶ Player chooses game mode (Quick Play/Scheduled/Private)
   └─▶ Stakes entry fee (automatically deposited to yield vault)
   └─▶ Waits for game to start (<30s for Quick Play)

2. ROUND 1-N (Elimination Rounds)
   └─▶ All players make binary choice (HEAD or TAIL)
   └─▶ Chainlink VRF generates random outcome
   └─▶ Minority survives, majority eliminated
   └─▶ Process repeats until 1 player remains

3. VICTORY
   └─▶ Last player standing wins
   └─▶ Claims: All entry fees + Accumulated yield + Platform bonus
   └─▶ NFT achievement minted
   └─▶ Leaderboard updated
```

### Example Game Scenario

**Initial Pool: 10 Players (10 MNT entry fee each = 100 MNT total)**

| Round | Players | Choice Distribution | Outcome | Eliminated | Remaining |
|-------|---------|---------------------|---------|------------|-----------|
| 1     | 10      | HEAD: 7, TAIL: 3    | HEAD    | 7          | 3         |
| 2     | 3       | HEAD: 2, TAIL: 1    | TAIL    | 1          | 2         |
| 3     | 2       | HEAD: 1, TAIL: 1    | HEAD    | 1          | 1 🏆      |

**Winner receives:**
- 100 MNT (original stakes)
- ~2 MNT (yield generated during 3 rounds)
- 50 $INVERSE tokens (platform bonus)
- "Tournament Champion" NFT badge

---

## 🚀 Key Features

### For Players
✅ **Fair & Transparent**: Provably random outcomes via Chainlink VRF  
✅ **No Waiting**: Multiple game modes ensure instant action  
✅ **Earn While Playing**: Staked funds generate yield  
✅ **Social Gaming**: Invite friends, spectate, chat  
✅ **Progression System**: Level up, unlock rewards  
✅ **Mobile Optimized**: Play anywhere, anytime  

### For the Ecosystem
✅ **Built on Mantle**: Low gas, high throughput  
✅ **RWA Integration**: First GameFi leveraging real yield  
✅ **Sustainable Economics**: Deflationary token model  
✅ **Composable**: Open API for integrations  
✅ **Compliant**: KYC optional for high-stakes games  

---

## 📊 Competitive Advantages

| Feature | Inverse Arena | Traditional GameFi | Web2 Games |
|---------|---------------|-------------------|------------|
| Instant Matchmaking | ✅ <30s | ❌ 5-10 min | ✅ Yes |
| Yield Generation | ✅ RWA-backed | ❌ No | ❌ No |
| True Ownership | ✅ NFTs | ⚠️ Limited | ❌ No |
| Social Features | ✅ Built-in | ⚠️ Basic | ✅ Advanced |
| Contrarian Gameplay | ✅ Unique | ❌ No | ❌ No |
| Sustainable Economy | ✅ Deflationary | ❌ Inflationary | N/A |

---

## 🎯 Roadmap

### Phase 1: Foundation (Q1 2025) ✅
- Smart contract development
- Frontend MVP
- Testnet deployment
- Security audit

### Phase 2: Launch (Q2 2025)
- Mainnet deployment on Mantle
- Quick Play mode live
- $INVERSE token launch
- Community building

### Phase 3: Growth (Q3 2025)
- Scheduled tournaments
- Mobile app release
- Partnership integrations
- Marketing campaigns

### Phase 4: Scale (Q4 2025)
- Advanced game modes
- Cross-chain expansion
- DAO governance launch
- Institutional partnerships

---

## 🛡️ Security

- **Audited by**: [Audit Firm TBD]
- **Bug Bounty**: Up to $50,000 for critical vulnerabilities
- **Multi-sig Treasury**: 3/5 signature requirement
- **Time Locks**: 24-hour delay on critical contract changes
- **Insurance**: Smart contract coverage via [Provider TBD]

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone the repository
git clone https://github.com/inverse-arena/inverse-arena.git

# Install dependencies
cd inverse-arena
npm install

# Run local development
npm run dev

# Run tests
npm test
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Website**: https://inversearena.xyz (coming soon)
- **Documentation**: https://docs.inversearena.xyz
- **Twitter**: [@InverseArena](https://twitter.com/InverseArena)
- **Discord**: [Join our community](https://discord.gg/inversearena)
- **Mantle Hackathon**: [Project Submission](#)

---

## 👥 Team

**[Your Name]** - Founder & Lead Developer  
**[Team Member 2]** - Smart Contract Engineer  
**[Team Member 3]** - Frontend Developer  
**[Team Member 4]** - Product Designer  

---

## 🙏 Acknowledgments

Built for the [Mantle Global Hackathon 2025](https://www.hackquest.io/hackathons/Mantle-Global-Hackathon-2025)

Special thanks to:
- Mantle Network team
- Chainlink for VRF integration
- OpenZeppelin for security standards
- The broader Ethereum community

---

## 📞 Contact

For partnerships, press inquiries, or support:
- Email: hello@inversearena.xyz
- Telegram: @InverseArena

---

<div align="center">

### ⭐ Star this repo if you believe in the future of contrarian GameFi! ⭐

**"Where the minority becomes the ONE"**

</div>