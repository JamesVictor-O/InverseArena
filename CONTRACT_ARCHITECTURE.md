# Inverse Arena - Smart Contract Architecture Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Core Contracts](#core-contracts)
4. [Data Structures](#data-structures)
5. [Contract Interactions](#contract-interactions)
6. [Game Flow](#game-flow)
7. [Yield Generation Flow](#yield-generation-flow)
8. [Security Features](#security-features)

---

## System Overview

**Inverse Arena** is a blockchain-based elimination game where players stake assets, make binary choices (Head/Tail), and the **minority survives** each round. The last player standing wins the entire prize pool plus accumulated yield from Real-World Asset (RWA) protocols.

### Key Features

- **Multi-Currency Support**: USDT0, mETH, and native MNT
- **RWA Yield Generation**: Stakes automatically generate 4-6% APY during gameplay
- **Provably Fair**: Chainlink VRF for random outcomes
- **Intelligent Matchmaking**: Solves the "waiting room problem"
- **NFT Achievements**: Player progression and rewards
- **Multiple Game Modes**: QuickPlay, Scheduled, and Private rooms

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    INVERSE ARENA SYSTEM                      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌────────▼────────┐  ┌──────▼──────────┐
│ GameManager   │  │  Matchmaking   │  │ YieldVault     │
│               │  │                 │  │                 │
│ - Game Logic  │  │ - Queue Mgmt    │  │ - RWA Deposits  │
│ - VRF         │  │ - Player Match  │  │ - Yield Calc    │
│ - Round Proc  │  │ - Auto-Start    │  │ - Distribution  │
└───────┬───────┘  └────────┬────────┘  └──────┬──────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │ NFTAchievements│
                    │                │
                    │ - Mint NFTs    │
                    │ - Track Stats  │
                    └────────────────┘
```

---

## Core Contracts

### 1. GameManager.sol

**Purpose**: Central contract managing all game logic, player interactions, and game state.

**Inherits**: `Ownable`, `ReentrancyGuard`, `VRFConsumerBaseV2`

**Key Responsibilities**:

- Game creation and lifecycle management
- Player participation and choice making
- Round processing with Chainlink VRF
- Winner determination and payout
- Integration with YieldVault and NFTAchievements

#### Key Functions

##### Game Creation Functions

**`createQuickPlayGameUSDT0(uint256 entryFee, uint256 maxPlayers)`**

- Creates a QuickPlay game using USDT0
- Transfers USDT0 from creator
- Deposits to YieldVault (USDT0 protocol)
- Auto-starts when minimum players join
- **Returns**: `gameId`

**`createQuickPlayGameMETH(uint256 entryFee, uint256 maxPlayers)`**

- Creates a QuickPlay game using mETH
- Transfers mETH from creator
- Deposits to YieldVault (mETH protocol)
- **Returns**: `gameId`

**`createQuickPlayGame(uint256 entryFee, uint256 maxPlayers)`**

- Creates a QuickPlay game using native MNT (legacy)
- Accepts native token via `payable`
- Deposits to YieldVault (native protocol)
- **Returns**: `gameId`

**`createScheduledTournamentUSDT0(uint256 startTime, uint256 entryFee, uint256 maxPlayers)`**

- Creates a scheduled tournament with future start time
- Uses USDT0 currency
- Starts automatically at `startTime` if minimum players joined
- **Returns**: `gameId`

**`createPrivateRoom(Currency currency, uint256 entryFee, uint256 maxPlayers)`**

- Creates a private room supporting all currencies
- Flexible currency selection (MNT, USDT0, METH)
- **Returns**: `gameId`

##### Game Participation Functions

**`joinGame(uint256 gameId)`**

- Allows players to join an existing game
- Transfers entry fee based on game currency
- Deposits to YieldVault automatically
- Auto-starts game if minimum players reached
- **Emits**: `PlayerJoined`

**`makeChoice(uint256 gameId, Choice choice)`**

- Player makes Head or Tail choice for current round
- Can only be called once per round
- Only active (non-eliminated) players can choose
- Triggers VRF request when all players have chosen
- **Emits**: `ChoiceMade`

##### Internal Game Logic Functions

**`_createGame(...)`**

- Internal function to create game structure
- Initializes game state, player list, and metadata
- Sets up first player (creator)
- Updates global stats

**`_startGame(uint256 gameId)`**

- Transitions game from `Waiting` to `InProgress`
- Initializes first round
- Requires minimum players

**`_requestVRF(uint256 gameId)`**

- Requests random number from Chainlink VRF
- Maps request ID to game ID for callback

**`fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)`**

- Chainlink VRF callback
- Processes round with randomness
- **Override**: From `VRFConsumerBaseV2`

**`_processRound(uint256 gameId, uint256 randomness)`**

- Determines winning choice (minority survives)
- Handles ties using randomness
- Eliminates majority players
- Advances to next round or completes game
- **Emits**: `RoundProcessed`

**`_completeGame(uint256 gameId, address winner)`**

- Finalizes game completion
- Calculates yield and platform fee
- Distributes winnings through YieldVault
- Mints achievement NFT
- Updates global statistics
- **Emits**: `GameCompleted`, `YieldGenerated`

##### View Functions

**`getGame(uint256 gameId)`**

- Returns comprehensive game information
- Includes status, players, prize pool, yield

**`getGamePlayers(uint256 gameId)`**

- Returns array of all player addresses

**`getPlayerInfo(uint256 gameId, address player)`**

- Returns player-specific information
- Includes choice, elimination status, entry amount

**`getStats()`**

- Returns global game statistics
- Total games, prize pools, yield generated

##### Admin Functions

**`setPlatformFee(uint256 newFeeBps)`**

- Updates platform fee (basis points)
- Maximum 10% (1000 bps)

**`setTokenAddresses(address _usdt0, address _mETH)`**

- Updates token contract addresses
- Allows flexibility for testnet/mainnet

**`updateContracts(address _yieldVault, address _nftAchievements)`**

- Updates integrated contract addresses
- Emergency upgrade path

**`emergencyWithdraw(address token)`**

- Emergency withdrawal function
- Owner only, for stuck funds

---

### 2. YieldVault.sol

**Purpose**: Manages Real-World Asset (RWA) deposits and yield generation for game stakes.

**Inherits**: `IYieldVault`, `Ownable`, `ReentrancyGuard`

**Key Responsibilities**:

- Deposit management across multiple RWA protocols
- Real-time yield calculation
- Yield distribution to winners
- Protocol configuration and APY management

#### Supported Protocols

1. **PROTOCOL_METH (0)**: Mantle Staked ETH - 4% APY
2. **PROTOCOL_USDT0 (1)**: USDT0 Yield-Bearing Stablecoin - 5% APY
3. **PROTOCOL_AAVE (2)**: Aave V3 Lending - 6% APY (configurable)
4. **PROTOCOL_ONDO_USDY (3)**: Ondo Finance USDY - 4.5% APY (configurable)

#### Key Functions

##### Deposit Functions

**`depositUSDT0(uint256 gameId, uint256 amount)`**

- Deposits USDT0 for a specific game
- Calculates shares based on current TVL
- Stores deposit with timestamp and protocol info
- **Returns**: `shares`
- **Emits**: `DepositedToProtocol`

**`depositMETH(uint256 gameId, uint256 amount)`**

- Deposits mETH for Ethereum staking yield
- Similar to `depositUSDT0` but for mETH protocol
- **Returns**: `shares`

**`depositToAave(uint256 gameId, address asset, uint256 amount)`**

- Deposits to Aave V3 lending pool
- Supports USDT0 or mETH assets
- Requires Aave protocol to be enabled
- **Returns**: `shares`

**`depositToYield(uint256 amount, uint8 protocol)`**

- Legacy function for native MNT deposits
- Payable function accepting native tokens
- **Returns**: `shares`

##### Yield Calculation Functions

**`getAccumulatedYield(uint256 gameId)`**

- Calculates real-time yield for a game
- Formula: `yield = principal * apy * timeElapsed / (year * basis_points)`
- Time-weighted calculation based on deposit timestamp
- **Returns**: `yieldAmount`

**`getYieldBreakdown(uint256 gameId)`**

- Returns detailed yield information
- Includes principal, yield, APY, time elapsed, protocol name
- **Returns**: Tuple of yield details

##### Distribution Functions

**`distributeYield(uint256 gameId, address winner)`**

- Distributes principal + accumulated yield to winner
- Handles both native and ERC20 tokens
- Updates protocol totals and TVL
- Records yield snapshot
- **Emits**: `YieldDistributed`

**`emitYieldSnapshot(uint256 gameId)`**

- Emits real-time yield update event
- Called during gameplay for live tracking
- **Emits**: `RealTimeYieldSnapshot`

##### Internal Functions

**`_calculateShares(uint256 amount, address asset, uint8 protocol)`**

- Calculates shares for deposit
- Uses 1:1 ratio for first deposit
- Proportional to TVL for subsequent deposits

**`_storeDeposit(...)`**

- Stores deposit information
- Updates TVL and protocol totals
- Links deposit to game ID

##### Admin Functions

**`updateProtocol(uint8 protocolId, address protocolAddress, bool enabled, uint256 apy, string memory name)`**

- Updates protocol configuration
- Can enable/disable protocols
- Adjust APY rates
- Maximum APY: 20% (2000 bps)

**`updateAPY(uint8 protocolId, uint256 newAPY)`**

- Updates APY for a specific protocol
- Allows dynamic rate adjustments
- **Emits**: `APYUpdated`

**`setTokenAddresses(...)`**

- Updates token contract addresses
- Supports protocol upgrades

**`setAaveEnabled(bool enabled)`**

- Enables/disables Aave integration
- Safety toggle for protocol

**`setOndoEnabled(bool enabled)`**

- Enables/disables Ondo USDY integration

##### View Functions

**`getTotalValueLocked()`**

- Returns total value locked across all protocols

**`getTVLByAsset(address asset)`**

- Returns TVL for a specific asset

**`getAllProtocols()`**

- Returns array of all protocol information
- Names, APYs, and enabled status

**`getYieldHistory(uint256 gameId)`**

- Returns yield snapshot history for a game
- Array of timestamped yield snapshots

---

### 3. NFTAchievements.sol

**Purpose**: Manages achievement NFTs for player milestones and progression.

**Inherits**: `ERC721URIStorage`, `Ownable`, `INFTAchievements`

**Key Responsibilities**:

- Minting achievement NFTs
- Tracking player achievements
- Metadata management
- Achievement verification

#### Achievement Types

1. **FirstWin (0)**: First game victory
2. **TenGameStreak (1)**: 10 consecutive wins
3. **TournamentChampion (2)**: Won a scheduled tournament (can mint multiple)
4. **LoyaltyBronze (3)**: Bronze loyalty tier
5. **LoyaltySilver (4)**: Silver loyalty tier
6. **LoyaltyGold (5)**: Gold loyalty tier
7. **LoyaltyPlatinum (6)**: Platinum loyalty tier
8. **ReferralMaster (7)**: Referred 10 active players
9. **YieldEarner (8)**: Earned 100 tokens from yield (can mint multiple)
10. **ContrarianMaster (9)**: Won by choosing minority 50+ times

#### Key Functions

##### Minting Functions

**`mintAchievement(address to, uint8 achievementType, uint256 gameId)`**

- Mints achievement NFT to player
- Only authorized contracts (GameManager) can call
- Prevents duplicate achievements (except TournamentChampion and YieldEarner)
- Stores achievement metadata
- **Emits**: `AchievementMinted`

##### View Functions

**`hasAchievement(address user, uint8 achievementType)`**

- Checks if user has specific achievement
- **Returns**: `bool`

**`getUserAchievements(address user)`**

- Returns all achievement token IDs for a user
- **Returns**: `uint256[]`

**`getAchievement(uint256 tokenId)`**

- Returns achievement details for a token
- Includes type, game ID, timestamp, metadata URI

**`getAchievementName(AchievementType aType)`**

- Returns human-readable achievement name

**`getAchievementDescription(AchievementType aType)`**

- Returns achievement description

##### Admin Functions

**`setBaseURI(string memory newBaseURI)`**

- Updates base URI for token metadata
- **Emits**: `BaseURIUpdated`

**`updateAchievementMetadata(AchievementType aType, string memory name, string memory description)`**

- Updates achievement metadata
- Allows customization of names/descriptions

**`setAuthorizedMinter(address minter, bool authorized)`**

- Authorizes contracts to mint achievements
- Currently only owner can mint

---

### 4. Matchmaking.sol

**Purpose**: Intelligent player matchmaking to solve the "waiting room problem".

**Inherits**: `Ownable`, `ReentrancyGuard`

**Key Responsibilities**:

- Queue management for players
- Automatic player matching
- Game creation from matched players
- Wait time estimation

#### Key Functions

##### Queue Management

**`addToQueue(GameManager.GameMode mode, uint256 entryFee)`**

- Adds player to matchmaking queue
- Accepts native MNT payment
- Automatically tries to match players
- **Emits**: `PlayerQueued`

**`removeFromQueue()`**

- Removes player from queue
- Refunds entry fee
- **Emits**: `PlayerDequeued`

##### Matching Functions

**`matchPlayers(GameManager.GameMode mode)`**

- Manually trigger matching for a game mode
- Public function for external triggers

**`_tryMatchPlayers(GameManager.GameMode mode)`**

- Internal matching algorithm
- Groups players by similar entry fees (10% tolerance)
- Creates game when threshold reached
- Removes matched players from queue
- **Emits**: `MatchCreated`

##### View Functions

**`estimateWaitTime(GameManager.GameMode mode)`**

- Estimates wait time for a game mode
- Based on queue length and historical data
- **Returns**: `waitTime` in seconds

**`getQueueStatus(GameManager.GameMode mode)`**

- Returns queue status information
- Queue length, min/max players, estimated wait

**`getQueuePlayers(GameManager.GameMode mode)`**

- Returns array of player addresses in queue

##### Admin Functions

**`updateConfig(GameManager.GameMode mode, MatchmakingConfig memory config)`**

- Updates matchmaking configuration
- Min/max players, wait times, thresholds

**`setGameManager(address _gameManager)`**

- Updates GameManager contract address

**`clearQueue(GameManager.GameMode mode)`**

- Emergency function to clear queue
- Refunds all players

**`emergencyWithdraw()`**

- Emergency withdrawal of contract balance

---

## Data Structures

### GameManager Data Structures

#### Game

```solidity
struct Game {
    uint256 gameId;
    GameMode mode;              // QuickPlay, Scheduled, Private
    GameStatus status;          // Waiting, InProgress, Completed, Cancelled
    Currency currency;          // MNT, USDT0, METH
    address currencyAddress;    // Token contract address
    uint256 entryFee;
    uint256 maxPlayers;
    uint256 minPlayers;
    uint256 startTime;          // For scheduled games
    uint256 currentRound;
    address creator;
    address winner;
    uint256 totalPrizePool;
    uint256 yieldAccumulated;
    uint8 yieldProtocol;        // Protocol ID from YieldVault
    bool yieldDistributed;
    address[] playerList;
}
```

#### Round

```solidity
struct Round {
    uint256 roundNumber;
    mapping(address => Choice) choices;        // Player choices
    mapping(Choice => uint256) choiceCounts;   // Head/Tail counts
    Choice winningChoice;                      // Random outcome
    address[] survivors;                       // Players who survived
    bool processed;
    uint256 timestamp;
}
```

#### PlayerInfo

```solidity
struct PlayerInfo {
    bool isPlaying;
    bool hasMadeChoice;
    Choice choice;              // Head or Tail
    bool eliminated;
    uint256 roundEliminated;
    uint256 entryAmount;
}
```

### YieldVault Data Structures

#### GameDeposit

```solidity
struct GameDeposit {
    uint256 gameId;
    address currency;           // Token address or address(0) for native
    uint256 amount;            // Principal amount
    uint256 shares;            // Shares in protocol
    uint256 timestamp;         // Deposit time
    uint8 protocol;            // Protocol ID
    uint256 initialAPY;        // APY at deposit time
    bool active;              // Is deposit active
}
```

#### ProtocolInfo

```solidity
struct ProtocolInfo {
    address protocolAddress;
    bool enabled;
    uint256 totalDeposited;
    uint256 totalShares;
    uint256 currentAPY;        // In basis points
    string name;
}
```

#### YieldSnapshot

```solidity
struct YieldSnapshot {
    uint256 timestamp;
    uint256 totalYield;
    uint256 apy;
}
```

### Matchmaking Data Structures

#### QueueEntry

```solidity
struct QueueEntry {
    address player;
    uint256 entryFee;
    uint256 timestamp;
    GameManager.GameMode preferredMode;
}
```

#### MatchmakingConfig

```solidity
struct MatchmakingConfig {
    uint256 minPlayers;
    uint256 maxPlayers;
    uint256 maxWaitTime;        // Seconds
    uint256 autoStartThreshold; // Players needed to auto-start
}
```

---

## Contract Interactions

### GameManager ↔ YieldVault

1. **Deposit Flow**:

   - GameManager calls `depositUSDT0()` or `depositMETH()` when game is created/joined
   - YieldVault stores deposit and calculates shares
   - GameManager tracks `yieldProtocol` in game state

2. **Yield Query**:

   - GameManager calls `getAccumulatedYield(gameId)` during game completion
   - YieldVault calculates time-weighted yield

3. **Distribution**:

   - GameManager calls `distributeYield(gameId, winner)` to pay winner
   - YieldVault transfers principal + yield to winner

4. **Snapshots**:
   - GameManager calls `emitYieldSnapshot(gameId)` between rounds
   - Provides real-time yield tracking

### GameManager ↔ NFTAchievements

1. **Minting**:

   - GameManager calls `mintAchievement(winner, 0, gameId)` on game completion
   - NFTAchievements mints "First Victory" NFT

2. **Verification**:
   - GameManager can check `hasAchievement()` for conditional logic
   - Used for streak tracking, loyalty tiers, etc.

### Matchmaking ↔ GameManager

1. **Game Creation**:

   - Matchmaking calls `createQuickPlayGame()` or `createPrivateRoom()`
   - GameManager creates game and returns `gameId`

2. **Player Joining**:
   - Matchmaking calls `joinGame(gameId)` for each matched player
   - GameManager adds players and handles deposits

---

## Game Flow

### Complete Game Lifecycle

```
1. GAME CREATION
   ├─ Player calls createQuickPlayGameUSDT0()
   ├─ GameManager creates game structure
   ├─ Deposits entry fee to YieldVault
   └─ Game status: Waiting

2. PLAYER JOINING
   ├─ Players call joinGame(gameId)
   ├─ Entry fees deposited to YieldVault
   ├─ Auto-start when minPlayers reached
   └─ Game status: InProgress

3. ROUND EXECUTION
   ├─ Players call makeChoice(gameId, choice)
   ├─ When all chosen: Request Chainlink VRF
   ├─ VRF callback: fulfillRandomWords()
   ├─ Process round: Minority survives
   ├─ Eliminate majority players
   └─ Advance to next round OR complete game

4. GAME COMPLETION
   ├─ Last player standing wins
   ├─ Calculate yield from YieldVault
   ├─ Distribute principal + yield to winner
   ├─ Mint achievement NFT
   └─ Game status: Completed
```

### Round Processing Logic

```
1. All active players make choices (Head/Tail)
2. Count choices: choiceCounts[Head] vs choiceCounts[Tail]
3. Determine minority choice (fewer votes)
4. If tie: Use VRF randomness to break tie
5. Eliminate players who chose majority
6. Survivors advance to next round
7. Repeat until 1 player remains
```

### Yield Accumulation

```
Time 0: Deposit 1000 USDT0 → YieldVault
Time 5min: Yield = 1000 * 0.05 * 300 / (31536000 * 10000) = ~0.48 USDT0
Time 10min: Yield = 1000 * 0.05 * 600 / (31536000 * 10000) = ~0.95 USDT0
Time 15min: Yield = 1000 * 0.05 * 900 / (31536000 * 10000) = ~1.43 USDT0

Winner receives: 950 USDT0 (principal - 5% fee) + 1.43 USDT0 (yield)
```

---

## Yield Generation Flow

### Deposit Flow

```
Player Stakes 100 USDT0
    ↓
GameManager receives USDT0
    ↓
GameManager.approve(YieldVault, 100)
    ↓
GameManager.depositUSDT0(gameId, 100)
    ↓
YieldVault.safeTransferFrom(GameManager, YieldVault, 100)
    ↓
YieldVault calculates shares
    ↓
YieldVault stores GameDeposit with timestamp
    ↓
Yield starts accumulating immediately
```

### Yield Calculation

**Formula**: `yield = principal * apy * timeElapsed / (SECONDS_PER_YEAR * BASIS_POINTS)`

**Example**:

- Principal: 1000 USDT0
- APY: 5% (500 basis points)
- Time: 15 minutes (900 seconds)
- Calculation: `1000 * 500 * 900 / (31536000 * 10000) = 1.43 USDT0`

### Distribution Flow

```
Game Completes
    ↓
GameManager.getAccumulatedYield(gameId)
    ↓
YieldVault calculates yield based on time elapsed
    ↓
GameManager.distributeYield(gameId, winner)
    ↓
YieldVault transfers principal + yield to winner
    ↓
YieldVault updates TVL and protocol totals
    ↓
YieldVault records yield snapshot
```

---

## Security Features

### Access Control

- **Ownable**: All contracts use OpenZeppelin's Ownable for admin functions
- **Authorized Minters**: NFTAchievements restricts minting to authorized contracts
- **ReentrancyGuard**: All state-changing functions protected with `nonReentrant`

### Input Validation

- Entry fees: `MIN_ENTRY_FEE <= entryFee <= MAX_ENTRY_FEE`
- Player counts: `MIN_PLAYERS <= players <= MAX_PLAYERS`
- Game status checks: Functions verify game is in correct state
- Player verification: Checks if player is in game before actions

### Randomness

- **Chainlink VRF**: Provably fair random number generation
- **Request-Response Pattern**: VRF requests mapped to game IDs
- **Tie Breaking**: Randomness used to break choice ties

### Financial Safety

- **Platform Fee Cap**: Maximum 10% (1000 basis points)
- **Emergency Withdrawals**: Owner can recover stuck funds
- **Safe Token Transfers**: Uses SafeERC20 for all ERC20 operations
- **Force Approve**: Uses modern `forceApprove` instead of deprecated `safeApprove`

### State Management

- **Atomic Operations**: Game state changes are atomic
- **Status Transitions**: Enforced through modifiers
- **Yield Tracking**: Separate tracking prevents double distribution

---

## Constants and Limits

### GameManager Constants

- `MIN_ENTRY_FEE`: 0.001 ether
- `MAX_ENTRY_FEE`: 100 ether
- `MIN_PLAYERS`: 4
- `MAX_PLAYERS`: 20
- `platformFeeBps`: 500 (5%, configurable up to 10%)

### YieldVault Constants

- `PROTOCOL_METH`: 0 (4% APY)
- `PROTOCOL_USDT0`: 1 (5% APY)
- `PROTOCOL_AAVE`: 2 (6% APY)
- `PROTOCOL_ONDO_USDY`: 3 (4.5% APY)
- `SECONDS_PER_YEAR`: 31,536,000
- `BASIS_POINTS`: 10,000
- Maximum APY: 20% (2000 basis points)

### Matchmaking Constants

- `DEFAULT_MIN_PLAYERS`: 4
- `DEFAULT_MAX_PLAYERS`: 20
- `DEFAULT_MAX_WAIT_TIME`: 30 seconds
- `DEFAULT_AUTO_START_THRESHOLD`: 4 players
- Entry fee tolerance: 10%

---

## Events

### GameManager Events

- `GameCreated`: Emitted when game is created
- `PlayerJoined`: Emitted when player joins game
- `ChoiceMade`: Emitted when player makes choice
- `RoundProcessed`: Emitted after round processing
- `GameCompleted`: Emitted when game finishes
- `YieldGenerated`: Emitted with yield information

### YieldVault Events

- `DepositedToProtocol`: Emitted on deposit
- `WithdrawnFromProtocol`: Emitted on withdrawal
- `YieldDistributed`: Emitted when yield paid to winner
- `ProtocolUpdated`: Emitted on protocol config change
- `APYUpdated`: Emitted on APY change
- `RealTimeYieldSnapshot`: Emitted for live yield tracking

### NFTAchievements Events

- `AchievementMinted`: Emitted when NFT is minted
- `BaseURIUpdated`: Emitted when metadata URI changes

### Matchmaking Events

- `PlayerQueued`: Emitted when player joins queue
- `PlayerDequeued`: Emitted when player leaves queue
- `MatchCreated`: Emitted when players matched and game created
- `ConfigUpdated`: Emitted on config change

---

## Integration Points

### External Dependencies

1. **Chainlink VRF**: For provably fair randomness

   - VRF Coordinator address
   - Subscription ID
   - Key Hash

2. **Token Contracts**:

   - USDT0: Mantle's yield-bearing stablecoin
   - mETH: Mantle Staked ETH
   - Native MNT: Mantle native token

3. **RWA Protocols** (via YieldVault):
   - USDT0 Protocol
   - mETH Protocol
   - Aave V3 (optional)
   - Ondo USDY (optional)

### Contract Deployment Order

1. Deploy YieldVault (requires token addresses)
2. Deploy NFTAchievements
3. Deploy GameManager (requires YieldVault, NFTAchievements, VRF config)
4. Deploy Matchmaking (requires GameManager)
5. Configure authorizations and permissions

---

## Future Enhancements

### Potential Additions

1. **Advanced Matchmaking**:

   - Skill-based matching
   - Historical performance tracking
   - Dynamic wait time calculation

2. **Additional Achievements**:

   - Streak tracking
   - Loyalty tier automation
   - Referral system integration

3. **Yield Protocol Expansion**:

   - More RWA protocols
   - Dynamic APY adjustment
   - Protocol risk management

4. **Game Modes**:
   - Tournament brackets
   - Team-based games
   - Custom rule sets

---

## Conclusion

The Inverse Arena contract architecture provides a robust, secure, and scalable foundation for a blockchain-based elimination game with integrated RWA yield generation. The modular design allows for easy upgrades and feature additions while maintaining security through proven patterns and access controls.

**Key Strengths**:

- ✅ Multi-currency support
- ✅ Real yield generation
- ✅ Provably fair randomness
- ✅ Intelligent matchmaking
- ✅ NFT achievements
- ✅ Comprehensive security

**Deployment Considerations**:

- Update token addresses for mainnet
- Configure Chainlink VRF subscription
- Set appropriate APY rates
- Configure matchmaking thresholds
- Test all game flows thoroughly

---

_Last Updated: January 2025_
_Solidity Version: 0.8.28_
_EVM Version: Cancun_
