
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IYieldVault.sol";
import "./interfaces/INFTAchievements.sol";

/**
 * @title GameManager - YOUR EXACT LOGIC
 * @notice Inverse Arena game with YOUR EXACT game flow:
 * 
 * GAME START LOGIC:
 * - Min players join → 1 minute countdown starts
 * - During 1 minute: More players can join (up to max)
 * - After 1 minute OR max reached: Game starts
 * 
 * ROUND LOGIC:
 * - Each round: 30 seconds to choose
 * - After 30 seconds: Round auto-processes
 * - Players who didn't choose: Auto-eliminated
 * - Minority choice survives, majority eliminated
 * - Continue until 1 winner remains
 */
contract GameManager is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
   
    
    enum GameMode {
        QuickPlay,
        Scheduled,
        Private
    }

    enum GameStatus {
        Waiting,        // Waiting for minimum players
        Countdown,      // Countdown started, accepting more players
        InProgress,     // Game started, rounds in progress
        Completed,      // Game finished
        Cancelled       // Game cancelled
    }

    enum Choice {
        Head,
        Tail,
        None 
    }

    enum Currency {
        MNT,
        USDT0,
        METH
    }

    // ============ Structs ============

    struct Game {
        uint256 gameId;
        GameMode mode;
        GameStatus status;
        Currency currency;
        address currencyAddress;
        uint256 entryFee;
        uint256 maxPlayers;
        uint256 minPlayers;
        uint256 startTime;
        uint256 countdownDeadline;      // ✅ When 1-minute countdown expires
        uint256 currentRound;
        address creator;
        address winner;
        uint256 totalPrizePool;
        uint256 yieldAccumulated;
        uint8 yieldProtocol;
        bool yieldDistributed;
        string name;
        address[] playerList;
    }

    struct Round {
        uint256 roundNumber;
        mapping(address => Choice) choices;
        mapping(Choice => uint256) choiceCounts;
        Choice winningChoice;
        address[] survivors;
        bool processed;
        uint256 timestamp;
        uint256 deadline;             
    }

    struct PlayerInfo {
        bool isPlaying;
        bool hasMadeChoice;
        Choice choice;
        bool eliminated;
        uint256 roundEliminated;
        uint256 entryAmount;
    }

    struct GameStats {
        uint256 totalGames;
        uint256 totalPrizePool;
        uint256 totalYieldGenerated;
        uint256 averageGameDuration;
    }

    struct CreatorStake {
        uint256 stakedAmount;
        uint256 yieldAccumulated;
        uint256 timestamp;
        uint256 activeGamesCount;
        bool hasStaked;
    }

    // ============ State Variables ============

    IYieldVault public yieldVault;
    INFTAchievements public nftAchievements;

    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(uint256 => Round)) public rounds;
    mapping(address => uint256[]) public playerGames;
    mapping(uint256 => mapping(address => PlayerInfo)) public playerInfo;
    mapping(address => CreatorStake) public creatorStakes;
    mapping(address => uint256[]) public creatorGames;
    mapping(address => uint256) public creatorStakeGameId;
    mapping(uint256 => bool) public winningsWithdrawn;

    address public USDT0;
    address public mETH;
    
    uint256 public platformFeeBps = 500;
    uint256 public creatorFeeBps = 1000;
    uint256 public constant MIN_CREATOR_STAKE = 30 * 10**6;
    uint256 public constant UNSTAKING_PENALTY_BPS = 1000;
    
    // ✅ YOUR EXACT TIMINGS
    uint256 public constant GAME_START_COUNTDOWN = 1 minutes; 
    uint256 public constant ROUND_DURATION = 30 seconds;      
    
    uint256 public constant MIN_ENTRY_FEE_MNT = 0.001 ether;
    uint256 public constant MIN_ENTRY_FEE_USDT0 = 1 * 10**6;
    uint256 public constant MIN_ENTRY_FEE_METH = 0.001 ether;
    
    uint256 public constant MAX_ENTRY_FEE_MNT = 100 ether;
    uint256 public constant MAX_ENTRY_FEE_USDT0 = 100000 * 10**6;
    uint256 public constant MAX_ENTRY_FEE_METH = 100 ether;
    
    uint256 public constant MIN_PLAYERS = 4;
    uint256 public constant MAX_PLAYERS = 20;
    uint256 public constant GAME_EXPIRY_TIME = 24 hours;

    GameStats public stats;
    uint256 private _gameIdCounter;

    // ============ Events ============

    event GameCreated(
        uint256 indexed gameId,
        GameMode mode,
        Currency currency,
        address indexed creator,
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 startTime
    );

    event PlayerJoined(
        uint256 indexed gameId,
        address indexed player,
        uint256 entryFee,
        Currency currency
    );

    event CountdownStarted(
        uint256 indexed gameId,
        uint256 deadline,
        uint256 currentPlayers,
        uint256 maxPlayers
    );

    event GameStarted(
        uint256 indexed gameId,
        uint256 finalPlayerCount,
        uint256 timestamp
    );

    event RoundStarted(
        uint256 indexed gameId,
        uint256 roundNumber,
        uint256 deadline,
        uint256 activePlayers
    );

    event ChoiceMade(
        uint256 indexed gameId,
        address indexed player,
        uint256 round,
        Choice choice
    );

    event PlayerEliminatedTimeout(
        uint256 indexed gameId,
        address indexed player,
        uint256 round,
        string reason
    );

    event RoundProcessed(
        uint256 indexed gameId,
        uint256 round,
        Choice winningChoice,
        uint256 eliminatedCount,
        uint256 survivorsCount,
        uint256 duration
    );

    event GameCompleted(
        uint256 indexed gameId,
        address indexed winner,
        uint256 principalPrize,
        uint256 yieldAmount,
        uint256 totalPayout,
        Currency currency
    );

    event YieldGenerated(
        uint256 indexed gameId,
        uint256 amount,
        uint8 protocol,
        string protocolName
    );

    event CreatorStaked(
        address indexed creator,
        uint256 amount,
        uint256 timestamp
    );

    event CreatorUnstaked(
        address indexed creator,
        uint256 stakedAmount,
        uint256 yieldAmount,
        uint256 penaltyAmount,
        uint256 totalReturned
    );

    event CreatorFeeDistributed(
        uint256 indexed gameId,
        address indexed creator,
        uint256 creatorFeeAmount
    );

    event WinnerWithdrawal(
        address indexed winner,
        uint256 indexed gameId,
        uint256 amount,
        bool leftInYield
    );
    
    event GameCancelled(
        uint256 indexed gameId,
        string reason
    );
    
    event CreatorYieldClaimed(
        address indexed creator,
        uint256 amount
    );

    // ============ Modifiers ============

    modifier validGame(uint256 gameId) {
        require(games[gameId].gameId == gameId, "Game does not exist");
        _;
    }

    modifier gameInStatus(uint256 gameId, GameStatus status) {
        require(games[gameId].status == status, "Game not in required status");
        _;
    }

    // ============ Constructor ============

    constructor(
        address _yieldVault,
        address _nftAchievements,
        address _usdt0,
        address _mETH
    ) Ownable(msg.sender) {
        yieldVault = IYieldVault(_yieldVault);
        nftAchievements = INFTAchievements(_nftAchievements);
        
        USDT0 = _usdt0;
        mETH = _mETH;
    }

    // ============ Creator Staking Functions ============

    function stakeAsCreator(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= MIN_CREATOR_STAKE, "Minimum stake is 30 USDT");
        
        CreatorStake storage stake = creatorStakes[msg.sender];
        
        IERC20(USDT0).safeTransferFrom(msg.sender, address(this), amount);
        
        if (stake.hasStaked) {
            stake.stakedAmount += amount;
        } else {
            stake.hasStaked = true;
            stake.stakedAmount = amount;
            stake.timestamp = block.timestamp;
            stake.activeGamesCount = 0;
            stake.yieldAccumulated = 0;
        }

        IERC20(USDT0).forceApprove(address(yieldVault), amount);
        
        uint256 creatorGameId = creatorStakeGameId[msg.sender];
        if (creatorGameId == 0) {
            creatorGameId = (2**255) + uint256(uint160(msg.sender));
            creatorStakeGameId[msg.sender] = creatorGameId;
        }
        
        yieldVault.depositUSDT0(creatorGameId, amount);

        emit CreatorStaked(msg.sender, amount, block.timestamp);
    }

    function unstakeCreator() external nonReentrant {
        CreatorStake storage stake = creatorStakes[msg.sender];
        require(stake.hasStaked, "No active stake");
        require(stake.stakedAmount > 0, "Nothing to unstake");

        uint256 stakedAmountToReturn = stake.stakedAmount;
        uint256 creatorGameId = creatorStakeGameId[msg.sender];
        require(creatorGameId != 0, "No stake gameId found");
        
        (uint256 principal, uint256 yieldFromVault) = yieldVault.withdrawToContract(creatorGameId);
        require(principal == stakedAmountToReturn, "Stake amount mismatch");
        
        uint256 totalYield = yieldFromVault + stake.yieldAccumulated;
        uint256 penaltyAmount = 0;
        uint256 finalYield = totalYield;
        
        if (stake.activeGamesCount > 0) {
            penaltyAmount = (totalYield * UNSTAKING_PENALTY_BPS) / 10000;
            finalYield = totalYield - penaltyAmount;
        }
        
        uint256 totalReturn = principal + finalYield;
        
        IERC20(USDT0).safeTransfer(msg.sender, totalReturn);

        stake.hasStaked = false;
        stake.stakedAmount = 0;
        stake.yieldAccumulated = 0;
        stake.timestamp = 0;
        creatorStakeGameId[msg.sender] = 0;

        emit CreatorUnstaked(msg.sender, stakedAmountToReturn, totalYield, penaltyAmount, totalReturn);
    }

    function claimCreatorYield() external nonReentrant {
        CreatorStake storage stake = creatorStakes[msg.sender];
        require(stake.hasStaked, "No active stake");
        require(stake.yieldAccumulated > 0, "No yield to claim");
        
        uint256 yieldAmount = stake.yieldAccumulated;
        stake.yieldAccumulated = 0;
        
        IERC20(USDT0).safeTransfer(msg.sender, yieldAmount);
        
        emit CreatorYieldClaimed(msg.sender, yieldAmount);
    }

    function getCreatorStake(address creator) external view returns (
        uint256 stakedAmount,
        uint256 yieldAccumulated,
        uint256 timestamp,
        uint256 activeGamesCount,
        bool hasStaked
    ) {
        CreatorStake memory stake = creatorStakes[creator];
        return (
            stake.stakedAmount,
            stake.yieldAccumulated,
            stake.timestamp,
            stake.activeGamesCount,
            stake.hasStaked
        );
    }

    // ============ Game Creation Functions ============

    function createQuickPlayGameUSDT0(
        string memory gameName,
        uint256 entryFee,
        uint256 maxPlayers
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(bytes(gameName).length > 0, "Game name required");
        require(creatorStakes[msg.sender].hasStaked && creatorStakes[msg.sender].stakedAmount >= MIN_CREATOR_STAKE, 
                "Must stake minimum 30 USDT to create games");
        require(entryFee >= MIN_ENTRY_FEE_USDT0 && entryFee <= MAX_ENTRY_FEE_USDT0, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");

        IERC20(USDT0).safeTransferFrom(msg.sender, address(this), entryFee);

        uint256 gameId = _createGame(
            GameMode.QuickPlay,
            Currency.USDT0,
            USDT0,
            entryFee,
            maxPlayers,
            block.timestamp,
            gameName
        );

        creatorGames[msg.sender].push(gameId);
        creatorStakes[msg.sender].activeGamesCount++;

        IERC20(USDT0).forceApprove(address(yieldVault), entryFee);
        yieldVault.depositUSDT0(gameId, entryFee);
        games[gameId].yieldProtocol = 1;

        emit GameCreated(gameId, GameMode.QuickPlay, Currency.USDT0, msg.sender, entryFee, maxPlayers, block.timestamp);
        emit PlayerJoined(gameId, msg.sender, entryFee, Currency.USDT0);

        return gameId;
    }

    function createQuickPlayGameMETH(
        string memory gameName,
        uint256 entryFee,
        uint256 maxPlayers
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(bytes(gameName).length > 0, "Game name required");
        require(entryFee >= MIN_ENTRY_FEE_METH && entryFee <= MAX_ENTRY_FEE_METH, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");
        require(creatorStakes[msg.sender].hasStaked && creatorStakes[msg.sender].stakedAmount >= MIN_CREATOR_STAKE, 
                "Must stake minimum 30 USDT to create games");

        IERC20(mETH).safeTransferFrom(msg.sender, address(this), entryFee);

        uint256 gameId = _createGame(
            GameMode.QuickPlay,
            Currency.METH,
            mETH,
            entryFee,
            maxPlayers,
            block.timestamp,
            gameName
        );

        creatorGames[msg.sender].push(gameId);
        creatorStakes[msg.sender].activeGamesCount++;

        IERC20(mETH).forceApprove(address(yieldVault), entryFee);
        yieldVault.depositMETH(gameId, entryFee);
        games[gameId].yieldProtocol = 0;

        emit GameCreated(gameId, GameMode.QuickPlay, Currency.METH, msg.sender, entryFee, maxPlayers, block.timestamp);
        emit PlayerJoined(gameId, msg.sender, entryFee, Currency.METH);

        return gameId;
    }

    function createQuickPlayGame(
        string memory gameName,
        uint256 entryFee,
        uint256 maxPlayers
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        require(bytes(gameName).length > 0, "Game name required");
        require(entryFee >= MIN_ENTRY_FEE_MNT && entryFee <= MAX_ENTRY_FEE_MNT, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");
        require(msg.value >= entryFee, "Insufficient payment");
        require(creatorStakes[msg.sender].hasStaked && creatorStakes[msg.sender].stakedAmount >= MIN_CREATOR_STAKE, 
                "Must stake minimum 30 USDT to create games");

        uint256 gameId = _createGame(
            GameMode.QuickPlay,
            Currency.MNT,
            address(0),
            entryFee,
            maxPlayers,
            block.timestamp,
            gameName
        );

        creatorGames[msg.sender].push(gameId);
        creatorStakes[msg.sender].activeGamesCount++;

        yieldVault.depositMNT{value: entryFee}(gameId, entryFee);

        emit GameCreated(gameId, GameMode.QuickPlay, Currency.MNT, msg.sender, entryFee, maxPlayers, block.timestamp);
        emit PlayerJoined(gameId, msg.sender, entryFee, Currency.MNT);

        return gameId;
    }

    function createScheduledTournamentUSDT0(
        string memory gameName,
        uint256 startTime,
        uint256 entryFee,
        uint256 maxPlayers
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(bytes(gameName).length > 0, "Game name required");
        require(startTime > block.timestamp, "Start time must be in future");
        require(entryFee >= MIN_ENTRY_FEE_USDT0 && entryFee <= MAX_ENTRY_FEE_USDT0, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");
        require(creatorStakes[msg.sender].hasStaked && creatorStakes[msg.sender].stakedAmount >= MIN_CREATOR_STAKE, 
                "Must stake minimum 30 USDT to create games");

        IERC20(USDT0).safeTransferFrom(msg.sender, address(this), entryFee);

        uint256 gameId = _createGame(
            GameMode.Scheduled,
            Currency.USDT0,
            USDT0,
            entryFee,
            maxPlayers,
            startTime,
            gameName
        );

        creatorGames[msg.sender].push(gameId);
        creatorStakes[msg.sender].activeGamesCount++;

        IERC20(USDT0).forceApprove(address(yieldVault), entryFee);
        yieldVault.depositUSDT0(gameId, entryFee);
        games[gameId].yieldProtocol = 1;

        emit GameCreated(gameId, GameMode.Scheduled, Currency.USDT0, msg.sender, entryFee, maxPlayers, startTime);
        emit PlayerJoined(gameId, msg.sender, entryFee, Currency.USDT0);

        return gameId;
    }

    function createPrivateRoom(
        string memory gameName,
        Currency currency,
        uint256 entryFee,
        uint256 maxPlayers
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        require(bytes(gameName).length > 0, "Game name required");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");
        require(creatorStakes[msg.sender].hasStaked && creatorStakes[msg.sender].stakedAmount >= MIN_CREATOR_STAKE, 
                "Must stake minimum 30 USDT to create games");
        
        if (currency == Currency.MNT) {
            require(entryFee >= MIN_ENTRY_FEE_MNT && entryFee <= MAX_ENTRY_FEE_MNT, "Invalid entry fee");
            require(msg.value >= entryFee, "Insufficient payment");
        } else if (currency == Currency.USDT0) {
            require(entryFee >= MIN_ENTRY_FEE_USDT0 && entryFee <= MAX_ENTRY_FEE_USDT0, "Invalid entry fee");
        } else if (currency == Currency.METH) {
            require(entryFee >= MIN_ENTRY_FEE_METH && entryFee <= MAX_ENTRY_FEE_METH, "Invalid entry fee");
        }

        address currencyAddress = _getCurrencyAddress(currency);
        
        if (currency != Currency.MNT) {
            IERC20(currencyAddress).safeTransferFrom(msg.sender, address(this), entryFee);
        }

        uint256 gameId = _createGame(
            GameMode.Private,
            currency,
            currencyAddress,
            entryFee,
            maxPlayers,
            block.timestamp,
            gameName
        );

        creatorGames[msg.sender].push(gameId);
        creatorStakes[msg.sender].activeGamesCount++;

        _depositToYieldVault(gameId, currency, entryFee);

        emit GameCreated(gameId, GameMode.Private, currency, msg.sender, entryFee, maxPlayers, block.timestamp);
        emit PlayerJoined(gameId, msg.sender, entryFee, currency);

        return gameId;
    }

    // ============ Game Participation ============

    /**
     * @notice Join an existing game
     * ✅ YOUR LOGIC: Start countdown when min players reached
     */
    function joinGame(uint256 gameId) external payable nonReentrant whenNotPaused validGame(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Waiting || game.status == GameStatus.Countdown, 
                "Game not accepting players");
        require(!_isPlayerInGame(gameId, msg.sender), "Already in game");
        require(game.playerList.length < game.maxPlayers, "Game full");
        
        uint256 requiredFee = game.entryFee;

        if (game.currency == Currency.MNT) {
            require(msg.value >= requiredFee, "Insufficient payment");
        } else {
            IERC20(game.currencyAddress).safeTransferFrom(msg.sender, address(this), requiredFee);
        }

        game.playerList.push(msg.sender);
        game.totalPrizePool += requiredFee;
        playerGames[msg.sender].push(gameId);
        
        playerInfo[gameId][msg.sender] = PlayerInfo({
            isPlaying: true,
            hasMadeChoice: false,
            choice: Choice.None,
            eliminated: false,
            roundEliminated: 0,
            entryAmount: requiredFee
        });

        _depositToYieldVault(gameId, game.currency, requiredFee);

        emit PlayerJoined(gameId, msg.sender, requiredFee, game.currency);

        // ✅ YOUR EXACT LOGIC: Start 1-minute countdown when min players reached
        if (game.status == GameStatus.Waiting && game.playerList.length == game.minPlayers) {
            game.status = GameStatus.Countdown;
            game.countdownDeadline = block.timestamp + GAME_START_COUNTDOWN;
            
            emit CountdownStarted(
                gameId,
                game.countdownDeadline,
                game.playerList.length,
                game.maxPlayers
            );
        }
        
        // ✅ Start immediately if max players reached (even during countdown)
        if (game.playerList.length == game.maxPlayers) {
            _startGame(gameId);
        }
    }

    /**
     * @notice Start game after countdown expires
     * ✅ YOUR LOGIC: Anyone can trigger after 1 minute
     */
    function startGameAfterCountdown(uint256 gameId) external validGame(gameId) whenNotPaused {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Countdown, "Game not in countdown");
        require(block.timestamp >= game.countdownDeadline, "Countdown not expired");
        require(game.playerList.length >= game.minPlayers, "Not enough players");
        
        _startGame(gameId);
    }

    /**
     * @notice Make choice for current round
     * ✅ YOUR LOGIC: Can make choice during 30-second window
     */
    function makeChoice(uint256 gameId, Choice choice) external validGame(gameId) whenNotPaused {
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");
        require(_isPlayerInGame(gameId, msg.sender), "Not a player");
        require(!playerInfo[gameId][msg.sender].eliminated, "Already eliminated");
        require(!playerInfo[gameId][msg.sender].hasMadeChoice, "Choice already made");
        require(choice == Choice.Head || choice == Choice.Tail, "Invalid choice");

        Round storage round = rounds[gameId][game.currentRound];
        require(block.timestamp < round.deadline, "Round time expired");
        
        round.choices[msg.sender] = choice;
        round.choiceCounts[choice]++;
        playerInfo[gameId][msg.sender].hasMadeChoice = true;
        playerInfo[gameId][msg.sender].choice = choice;

        emit ChoiceMade(gameId, msg.sender, game.currentRound, choice);

        // If all players chosen, process immediately (don't wait for timer)
        if (_allPlayersChosen(gameId)) {
            uint256 randomness = _generateRandomness(gameId);
            _processRound(gameId, randomness);
        }
    }

    /**
     * @notice Process round after 30-second timeout
     * ✅ YOUR LOGIC: Auto-process after 30 seconds, eliminate non-choosers
     */
    function processRoundTimeout(uint256 gameId) external validGame(gameId) whenNotPaused {
        Game storage game = games[gameId];
        Round storage round = rounds[gameId][game.currentRound];
        
        require(game.status == GameStatus.InProgress, "Game not in progress");
        require(!round.processed, "Round already processed");
        require(block.timestamp >= round.deadline, "Round not timed out yet");
        
        // ✅ YOUR LOGIC: Auto-eliminate players who didn't choose
        for (uint256 i = 0; i < game.playerList.length; i++) {
            address player = game.playerList[i];
            if (!playerInfo[gameId][player].eliminated && 
                !playerInfo[gameId][player].hasMadeChoice) {
                
                playerInfo[gameId][player].eliminated = true;
                playerInfo[gameId][player].roundEliminated = game.currentRound;
                
                emit PlayerEliminatedTimeout(gameId, player, game.currentRound, "Did not make choice in time");
            }
        }
        
        // Check if we still have players
        uint256 remainingPlayers = _getActivePlayerCount(gameId);
        require(remainingPlayers > 0, "No players remaining");
        
        // If only one player left, they win
        if (remainingPlayers == 1) {
            for (uint256 i = 0; i < game.playerList.length; i++) {
                if (!playerInfo[gameId][game.playerList[i]].eliminated) {
                    _completeGame(gameId, game.playerList[i]);
                    return;
                }
            }
        }
        
        // Otherwise, process round normally
        uint256 randomness = _generateRandomness(gameId);
        _processRound(gameId, randomness);
    }

    // ============ Internal Game Logic ============

    function _createGame(
        GameMode mode,
        Currency currency,
        address currencyAddress,
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 startTime,
        string memory gameName
    ) internal returns (uint256) {
        uint256 gameId = _gameIdCounter++;

        Game storage game = games[gameId];
        game.gameId = gameId;
        game.mode = mode;
        game.status = GameStatus.Waiting;
        game.currency = currency;
        game.currencyAddress = currencyAddress;
        game.entryFee = entryFee;
        game.maxPlayers = maxPlayers;
        game.minPlayers = MIN_PLAYERS;
        game.startTime = startTime;
        game.creator = msg.sender;
        game.totalPrizePool = entryFee;
        game.name = gameName;

        game.playerList.push(msg.sender);
        playerGames[msg.sender].push(gameId);
        
        playerInfo[gameId][msg.sender] = PlayerInfo({
            isPlaying: true,
            hasMadeChoice: false,
            choice: Choice.None,
            eliminated: false,
            roundEliminated: 0,
            entryAmount: entryFee
        });

        stats.totalGames++;

        return gameId;
    }

    /**
     * @notice Start the game
     * ✅ YOUR LOGIC: Called after 1-minute countdown OR when max players reached
     */
    function _startGame(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Waiting || game.status == GameStatus.Countdown, 
                "Game already started");
        require(game.playerList.length >= game.minPlayers, "Not enough players");

        game.status = GameStatus.InProgress;
        game.currentRound = 1;

        // ✅ YOUR LOGIC: Start Round 1 with 30-second timer
        Round storage round = rounds[gameId][1];
        round.roundNumber = 1;
        round.timestamp = block.timestamp;
        round.deadline = block.timestamp + ROUND_DURATION;
        
        emit GameStarted(gameId, game.playerList.length, block.timestamp);
        emit RoundStarted(gameId, 1, round.deadline, game.playerList.length);
    }

    function _generateRandomness(uint256 gameId) internal view returns (uint256) {
        Game storage game = games[gameId];
        Round storage round = rounds[gameId][game.currentRound];
        
        bytes32 blockHash = blockhash(block.number - 1);
        if (blockHash == bytes32(0) && block.number > 0) {
            blockHash = blockhash(block.number);
        }
        if (blockHash == bytes32(0)) {
            blockHash = keccak256(abi.encodePacked(block.number, block.timestamp));
        }
        
        uint256 gameData = uint256(keccak256(abi.encodePacked(
            gameId,
            game.currentRound,
            game.startTime,
            round.timestamp
        )));
        
        bytes32 playerEntropy = bytes32(0);
        for (uint256 i = 0; i < game.playerList.length; i++) {
            if (!playerInfo[gameId][game.playerList[i]].eliminated) {
                playerEntropy = keccak256(abi.encodePacked(
                    playerEntropy,
                    game.playerList[i],
                    round.choices[game.playerList[i]]
                ));
            }
        }
        
        return uint256(keccak256(abi.encodePacked(
            blockHash,
            block.timestamp,
            gameData,
            playerEntropy,
            block.prevrandao,
            block.number
        )));
    }

 
    function _processRound(uint256 gameId, uint256 randomness) internal {
        Game storage game = games[gameId];
        Round storage round = rounds[gameId][game.currentRound];
        
        require(!round.processed, "Round already processed");
        require(game.status == GameStatus.InProgress, "Game not in progress");

        uint256 headCount = round.choiceCounts[Choice.Head];
        uint256 tailCount = round.choiceCounts[Choice.Tail];
        
     
        if (headCount == 0 || tailCount == 0) {
            _handleUnanimousChoice(gameId, randomness);
            return;
        }
        

        Choice minorityChoice;
        if (headCount < tailCount) {
            minorityChoice = Choice.Head;
        } else if (tailCount < headCount) {
            minorityChoice = Choice.Tail;
        } else {
            minorityChoice = randomness % 2 == 0 ? Choice.Tail : Choice.Head;
        }

        round.winningChoice = minorityChoice;

        uint256 eliminated = 0;
        for (uint256 i = 0; i < game.playerList.length; i++) {
            address player = game.playerList[i];
            if (!playerInfo[gameId][player].eliminated) {
                if (round.choices[player] == minorityChoice) {
                    round.survivors.push(player);
                } else {
                    playerInfo[gameId][player].eliminated = true;
                    playerInfo[gameId][player].roundEliminated = game.currentRound;
                    eliminated++;
                }
            }
        }

        round.processed = true;

        emit RoundProcessed(
            gameId, 
            game.currentRound, 
            minorityChoice, 
            eliminated, 
            round.survivors.length, 
            block.timestamp - round.timestamp
        );

        if (round.survivors.length == 1) {
            _completeGame(gameId, round.survivors[0]);
        } else if (round.survivors.length > 1) {
            _startNextRound(gameId);
        }
    }

    function _handleUnanimousChoice(uint256 gameId, uint256 randomness) internal {
        Game storage game = games[gameId];
        Round storage round = rounds[gameId][game.currentRound];
        
        address[] memory activePlayers = new address[](_getActivePlayerCount(gameId));
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < game.playerList.length; i++) {
            if (!playerInfo[gameId][game.playerList[i]].eliminated) {
                activePlayers[activeCount] = game.playerList[i];
                activeCount++;
            }
        }
        
        if (activeCount == 2) {
            address winner = activePlayers[randomness % 2];
            round.survivors.push(winner);
            
            for (uint256 i = 0; i < activeCount; i++) {
                if (activePlayers[i] != winner) {
                    playerInfo[gameId][activePlayers[i]].eliminated = true;
                    playerInfo[gameId][activePlayers[i]].roundEliminated = game.currentRound;
                }
            }
        } else {
            uint256 toEliminate = activeCount / 2;
            if (toEliminate == 0) toEliminate = activeCount - 1;
            
            bool[] memory isEliminated = new bool[](activeCount);
            
            for (uint256 i = 0; i < toEliminate; i++) {
                uint256 randomIndex = uint256(keccak256(abi.encodePacked(randomness, i))) % activeCount;
                while (isEliminated[randomIndex]) {
                    randomIndex = (randomIndex + 1) % activeCount;
                }
                isEliminated[randomIndex] = true;
                
                playerInfo[gameId][activePlayers[randomIndex]].eliminated = true;
                playerInfo[gameId][activePlayers[randomIndex]].roundEliminated = game.currentRound;
            }
            
            for (uint256 i = 0; i < activeCount; i++) {
                if (!isEliminated[i]) {
                    round.survivors.push(activePlayers[i]);
                }
            }
        }
        
        round.processed = true;
        round.winningChoice = round.choiceCounts[Choice.Head] > 0 ? Choice.Head : Choice.Tail;
        
        emit RoundProcessed(
            gameId, 
            game.currentRound, 
            round.winningChoice, 
            activeCount - round.survivors.length, 
            round.survivors.length, 
            block.timestamp - round.timestamp
        );
        
        if (round.survivors.length == 1) {
            _completeGame(gameId, round.survivors[0]);
        } else if (round.survivors.length > 1) {
            _startNextRound(gameId);
        }
    }

    /**
     * @notice Start the next round
     * ✅ YOUR LOGIC: New 30-second countdown starts
     */
    function _startNextRound(uint256 gameId) internal {
        Game storage game = games[gameId];
        Round storage currentRound = rounds[gameId][game.currentRound];
        
        game.currentRound++;
        Round storage nextRound = rounds[gameId][game.currentRound];
        nextRound.roundNumber = game.currentRound;
        nextRound.timestamp = block.timestamp;
        nextRound.deadline = block.timestamp + ROUND_DURATION; // ✅ New 30-second timer
        
        // Reset choices for survivors
        for (uint256 i = 0; i < currentRound.survivors.length; i++) {
            playerInfo[gameId][currentRound.survivors[i]].hasMadeChoice = false;
            playerInfo[gameId][currentRound.survivors[i]].choice = Choice.None;
        }

        yieldVault.emitYieldSnapshot(gameId);
        
        emit RoundStarted(gameId, game.currentRound, nextRound.deadline, currentRound.survivors.length);
    }

    function _completeGame(uint256 gameId, address winner) internal {
        Game storage game = games[gameId];
        
        game.status = GameStatus.Completed;
        game.winner = winner;
        game.yieldDistributed = true;
        
        address creator = game.creator;
        
        if (creatorStakes[creator].activeGamesCount > 0) {
            creatorStakes[creator].activeGamesCount--;
        }

        (uint256 principal, uint256 yieldAmount) = yieldVault.withdrawToContract(gameId);
        
        game.yieldAccumulated = yieldAmount;
        
        require(principal == game.totalPrizePool, "Principal mismatch");
        
        uint256 platformFee = (game.totalPrizePool * platformFeeBps) / 10000;
        uint256 creatorFee = (game.totalPrizePool * creatorFeeBps) / 10000;
        uint256 winnerPrize = game.totalPrizePool - platformFee - creatorFee;
        uint256 totalWinnerPayout = winnerPrize + yieldAmount;

        if (game.currency == Currency.MNT) {
            if (platformFee > 0) {
                payable(owner()).transfer(platformFee);
            }

            if (creator != address(0) && creatorStakes[creator].hasStaked && creatorFee > 0) {
                creatorStakes[creator].yieldAccumulated += creatorFee;
                payable(creator).transfer(creatorFee);
                emit CreatorFeeDistributed(gameId, creator, creatorFee);
            }
        } else {
            if (platformFee > 0) {
                IERC20(game.currencyAddress).safeTransfer(owner(), platformFee);
            }

            if (creator != address(0) && creatorStakes[creator].hasStaked && creatorFee > 0) {
                creatorStakes[creator].yieldAccumulated += creatorFee;
                IERC20(game.currencyAddress).safeTransfer(creator, creatorFee);
                emit CreatorFeeDistributed(gameId, creator, creatorFee);
            }
        }

        nftAchievements.mintAchievement(winner, 0, gameId);

        stats.totalPrizePool += principal;
        stats.totalYieldGenerated += yieldAmount;

        emit GameCompleted(gameId, winner, winnerPrize, yieldAmount, totalWinnerPayout, game.currency);
        emit YieldGenerated(gameId, yieldAmount, game.yieldProtocol, "RWA Protocol");
    }

    // ============ Helper Functions ============

    function _isPlayerInGame(uint256 gameId, address player) internal view returns (bool) {
        return playerInfo[gameId][player].isPlaying;
    }

    function _allPlayersChosen(uint256 gameId) internal view returns (bool) {
        Game storage game = games[gameId];
        uint256 activePlayers = 0;
        uint256 choicesMade = 0;

        for (uint256 i = 0; i < game.playerList.length; i++) {
            address player = game.playerList[i];
            if (!playerInfo[gameId][player].eliminated) {
                activePlayers++;
                if (playerInfo[gameId][player].hasMadeChoice) {
                    choicesMade++;
                }
            }
        }

        return choicesMade == activePlayers && activePlayers > 1;
    }

    function _getActivePlayerCount(uint256 gameId) internal view returns (uint256) {
        Game storage game = games[gameId];
        uint256 count = 0;
        
        for (uint256 i = 0; i < game.playerList.length; i++) {
            if (!playerInfo[gameId][game.playerList[i]].eliminated) {
                count++;
            }
        }
        
        return count;
    }

    function _getCurrencyAddress(Currency currency) internal view returns (address) {
        if (currency == Currency.USDT0) return USDT0;
        if (currency == Currency.METH) return mETH;
        return address(0);
    }

    function _depositToYieldVault(uint256 gameId, Currency currency, uint256 amount) internal {
        if (currency == Currency.USDT0) {
            IERC20(USDT0).forceApprove(address(yieldVault), amount);
            yieldVault.depositUSDT0(gameId, amount);
            games[gameId].yieldProtocol = 1;
        } else if (currency == Currency.METH) {
            IERC20(mETH).forceApprove(address(yieldVault), amount);
            yieldVault.depositMETH(gameId, amount);
            games[gameId].yieldProtocol = 0;
        } else {
            // MNT - use depositMNT with gameId
            yieldVault.depositMNT{value: amount}(gameId, amount);
            games[gameId].yieldProtocol = 0; // MNT uses mETH protocol (PROTOCOL_METH = 0)
        }
    }

    // ============ Winner Withdrawal Functions ============

    function withdrawWinnings(uint256 gameId, bool leaveInYield) external nonReentrant validGame(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Completed, "Game not completed");
        require(game.winner == msg.sender, "Not the winner");
        require(game.yieldDistributed, "Yield not yet distributed");
        require(!winningsWithdrawn[gameId], "Already withdrawn");
        
        winningsWithdrawn[gameId] = true;
        
        uint256 platformFee = (game.totalPrizePool * platformFeeBps) / 10000;
        uint256 creatorFee = (game.totalPrizePool * creatorFeeBps) / 10000;
        uint256 winnerPrize = game.totalPrizePool - platformFee - creatorFee;
        uint256 totalWinnings = winnerPrize + game.yieldAccumulated;

        if (leaveInYield) {
            if (game.currency == Currency.MNT) {
                payable(msg.sender).transfer(totalWinnings);
            } else {
                IERC20(game.currencyAddress).forceApprove(address(yieldVault), totalWinnings);
                yieldVault.depositUSDT0(gameId + 1000000, totalWinnings);
            }
            emit WinnerWithdrawal(msg.sender, gameId, totalWinnings, true);
        } else {
            if (game.currency == Currency.MNT) {
                payable(msg.sender).transfer(totalWinnings);
            } else {
                IERC20(game.currencyAddress).safeTransfer(msg.sender, totalWinnings);
            }
            emit WinnerWithdrawal(msg.sender, gameId, totalWinnings, false);
        }
    }

    // ============ Game Cancellation ============

    function cancelExpiredGame(uint256 gameId) external validGame(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Waiting, "Game not waiting");
        require(block.timestamp > game.startTime + GAME_EXPIRY_TIME, "Not expired");
        
        game.status = GameStatus.Cancelled;
        
        for (uint256 i = 0; i < game.playerList.length; i++) {
            address player = game.playerList[i];
            uint256 refundAmount = playerInfo[gameId][player].entryAmount;
            
            if (game.currency == Currency.MNT) {
                payable(player).transfer(refundAmount);
            } else {
                IERC20(game.currencyAddress).safeTransfer(player, refundAmount);
            }
        }
        
        if (creatorStakes[game.creator].activeGamesCount > 0) {
            creatorStakes[game.creator].activeGamesCount--;
        }
        
        emit GameCancelled(gameId, "Game expired");
    }

    // ============ View Functions ============

    function getGame(uint256 gameId) external view validGame(gameId) returns (
        uint256 gameId_,
        GameMode mode,
        GameStatus status,
        Currency currency,
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 currentRound,
        address winner,
        uint256 totalPrizePool,
        uint256 yieldAccumulated,
        uint256 playerCount,
        string memory gameName
    ) {
        Game storage game = games[gameId];
        return (
            game.gameId,
            game.mode,
            game.status,
            game.currency,
            game.entryFee,
            game.maxPlayers,
            game.currentRound,
            game.winner,
            game.totalPrizePool,
            game.yieldAccumulated,
            game.playerList.length,
            game.name
        );
    }

    /**
     * @notice Get countdown time remaining
     * ✅ YOUR LOGIC: Check 1-minute countdown status
     */
    function getCountdownTimeRemaining(uint256 gameId) external view validGame(gameId) returns (uint256) {
        Game storage game = games[gameId];
        
        if (game.status != GameStatus.Countdown) {
            return 0;
        }
        
        if (block.timestamp >= game.countdownDeadline) {
            return 0;
        }
        
        return game.countdownDeadline - block.timestamp;
    }

    /**
     * @notice Get round time remaining
     * ✅ YOUR LOGIC: Check 30-second round timer
     */
    function getRoundTimeRemaining(uint256 gameId) external view validGame(gameId) returns (uint256) {
        Game storage game = games[gameId];
        if (game.status != GameStatus.InProgress) return 0;
        
        Round storage round = rounds[gameId][game.currentRound];
        if (round.processed) return 0;
        if (block.timestamp >= round.deadline) return 0;
        
        return round.deadline - block.timestamp;
    }

    function getCreatorGames(address creator) external view returns (uint256[] memory) {
        return creatorGames[creator];
    }

    function getGamePlayers(uint256 gameId) external view validGame(gameId) returns (address[] memory) {
        return games[gameId].playerList;
    }

    function getPlayerInfo(uint256 gameId, address player) external view returns (PlayerInfo memory) {
        return playerInfo[gameId][player];
    }

    function getStats() external view returns (GameStats memory) {
        return stats;
    }

    // ============ Admin Functions ============

    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high");
        platformFeeBps = newFeeBps;
    }

    function setCreatorFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 2000, "Fee too high");
        creatorFeeBps = newFeeBps;
    }

    function setTokenAddresses(address _usdt0, address _mETH) external onlyOwner {
        if (_usdt0 != address(0)) USDT0 = _usdt0;
        if (_mETH != address(0)) mETH = _mETH;
    }

    function updateContracts(address _yieldVault, address _nftAchievements) external onlyOwner {
        if (_yieldVault != address(0)) {
            yieldVault = IYieldVault(_yieldVault);
        }
        if (_nftAchievements != address(0)) nftAchievements = INFTAchievements(_nftAchievements);
    }

    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            uint256 balance = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransfer(owner(), balance);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {}
}
