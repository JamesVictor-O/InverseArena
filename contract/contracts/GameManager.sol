// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "./interfaces/IYieldVault.sol";
import "./interfaces/IInverseToken.sol";
import "./interfaces/INFTAchievements.sol";

/**
 * @title GameManager
 * @notice Core game logic for Inverse Arena - where the minority wins
 * @dev Manages game creation, player participation, round processing, and winner determination
 */
contract GameManager is Ownable, ReentrancyGuard, VRFConsumerBaseV2 {
    using Counters for Counters.Counter;

    // ============ Enums ============
    
    enum GameMode {
        QuickPlay,
        Scheduled,
        Private
    }

    enum GameStatus {
        Waiting,
        InProgress,
        Completed,
        Cancelled
    }

    enum Choice {
        Head,
        Tail
    }

    // ============ Structs ============

    struct Game {
        uint256 gameId;
        GameMode mode;
        GameStatus status;
        uint256 entryFee;
        uint256 maxPlayers;
        uint256 minPlayers;
        uint256 startTime;
        uint256 currentRound;
        address creator;
        address winner;
        uint256 totalPrizePool;
        uint256 yieldAccumulated;
        bool yieldDistributed;
        mapping(address => bool) players;
        mapping(uint256 => Round) rounds;
        address[] playerList;
    }

    struct Round {
        uint256 roundNumber;
        mapping(address => Choice) choices;
        mapping(Choice => uint256) choiceCounts;
        Choice winningChoice;
        address[] survivors;
        bool processed;
    }

    struct PlayerInfo {
        bool isPlaying;
        bool hasMadeChoice;
        Choice choice;
        bool eliminated;
        uint256 roundEliminated;
    }

    // ============ State Variables ============

    Counters.Counter private _gameIdCounter;
    
    IYieldVault public yieldVault;
    IInverseToken public inverseToken;
    INFTAchievements public nftAchievements;
    VRFCoordinatorV2Interface public vrfCoordinator;

    uint64 public vrfSubscriptionId;
    bytes32 public vrfKeyHash;
    uint32 public vrfCallbackGasLimit = 500000;
    uint16 public vrfRequestConfirmations = 3;

    mapping(uint256 => Game) public games;
    mapping(uint256 => uint256) public vrfRequestToGameId;
    mapping(address => uint256[]) public playerGames;
    mapping(uint256 => mapping(address => PlayerInfo)) public playerInfo;

    uint256 public platformFeeBps = 500; // 5%
    uint256 public constant MIN_ENTRY_FEE = 0.001 ether;
    uint256 public constant MAX_ENTRY_FEE = 100 ether;
    uint256 public constant MIN_PLAYERS = 4;
    uint256 public constant MAX_PLAYERS = 20;

    // ============ Events ============

    event GameCreated(
        uint256 indexed gameId,
        GameMode mode,
        address indexed creator,
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 startTime
    );

    event PlayerJoined(
        uint256 indexed gameId,
        address indexed player,
        uint256 entryFee
    );

    event ChoiceMade(
        uint256 indexed gameId,
        address indexed player,
        uint256 round,
        Choice choice
    );

    event RoundProcessed(
        uint256 indexed gameId,
        uint256 round,
        Choice winningChoice,
        uint256 eliminatedCount,
        uint256 survivorsCount
    );

    event GameCompleted(
        uint256 indexed gameId,
        address indexed winner,
        uint256 totalPrize,
        uint256 yieldAmount
    );

    event YieldDistributed(
        uint256 indexed gameId,
        address indexed winner,
        uint256 yieldAmount
    );

    // ============ Modifiers ============

    modifier validGame(uint256 gameId) {
        require(games[gameId].gameId != 0, "Game does not exist");
        _;
    }

    modifier gameInStatus(uint256 gameId, GameStatus status) {
        require(games[gameId].status == status, "Game not in required status");
        _;
    }

    // ============ Constructor ============

    constructor(
        address _yieldVault,
        address _inverseToken,
        address _nftAchievements,
        address _vrfCoordinator,
        uint64 _vrfSubscriptionId,
        bytes32 _vrfKeyHash
    ) VRFConsumerBaseV2(_vrfCoordinator) Ownable(msg.sender) {
        yieldVault = IYieldVault(_yieldVault);
        inverseToken = IInverseToken(_inverseToken);
        nftAchievements = INFTAchievements(_nftAchievements);
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        vrfSubscriptionId = _vrfSubscriptionId;
        vrfKeyHash = _vrfKeyHash;
    }

    // ============ Game Creation Functions ============

    /**
     * @notice Create a Quick Play game
     * @param entryFee Entry fee in native token
     * @param maxPlayers Maximum number of players (4-20)
     */
    function createQuickPlayGame(
        uint256 entryFee,
        uint256 maxPlayers
    ) external payable nonReentrant returns (uint256) {
        require(entryFee >= MIN_ENTRY_FEE && entryFee <= MAX_ENTRY_FEE, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");
        require(msg.value >= entryFee, "Insufficient payment");

        uint256 gameId = _gameIdCounter.current();
        _gameIdCounter.increment();

        Game storage game = games[gameId];
        game.gameId = gameId;
        game.mode = GameMode.QuickPlay;
        game.status = GameStatus.Waiting;
        game.entryFee = entryFee;
        game.maxPlayers = maxPlayers;
        game.minPlayers = MIN_PLAYERS;
        game.startTime = block.timestamp;
        game.creator = msg.sender;
        game.totalPrizePool = entryFee;

        // Apply discount if user has staked tokens
        uint256 discount = inverseToken.getEntryFeeDiscount(msg.sender);
        if (discount > 0) {
            uint256 discountAmount = (entryFee * discount) / 100;
            game.totalPrizePool -= discountAmount;
            // Refund discount amount
            payable(msg.sender).transfer(discountAmount);
        }

        // Add creator as first player
        game.players[msg.sender] = true;
        game.playerList.push(msg.sender);
        playerGames[msg.sender].push(gameId);

        // Deposit to yield vault
        uint256 depositAmount = game.totalPrizePool;
        yieldVault.depositToYield(depositAmount, 0); // 0 = mETH protocol

        emit GameCreated(gameId, GameMode.QuickPlay, msg.sender, entryFee, maxPlayers, block.timestamp);
        emit PlayerJoined(gameId, msg.sender, entryFee);

        // Auto-start if minimum players reached
        if (game.playerList.length >= game.minPlayers) {
            _startGame(gameId);
        }

        return gameId;
    }

    /**
     * @notice Create a Scheduled game
     * @param startTime Scheduled start time (must be in future)
     * @param entryFee Entry fee in native token
     * @param maxPlayers Maximum number of players
     */
    function createScheduledGame(
        uint256 startTime,
        uint256 entryFee,
        uint256 maxPlayers
    ) external payable nonReentrant returns (uint256) {
        require(startTime > block.timestamp, "Start time must be in future");
        require(entryFee >= MIN_ENTRY_FEE && entryFee <= MAX_ENTRY_FEE, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");
        require(msg.value >= entryFee, "Insufficient payment");

        uint256 gameId = _gameIdCounter.current();
        _gameIdCounter.increment();

        Game storage game = games[gameId];
        game.gameId = gameId;
        game.mode = GameMode.Scheduled;
        game.status = GameStatus.Waiting;
        game.entryFee = entryFee;
        game.maxPlayers = maxPlayers;
        game.minPlayers = MIN_PLAYERS;
        game.startTime = startTime;
        game.creator = msg.sender;
        game.totalPrizePool = entryFee;

        // Apply discount
        uint256 discount = inverseToken.getEntryFeeDiscount(msg.sender);
        if (discount > 0) {
            uint256 discountAmount = (entryFee * discount) / 100;
            game.totalPrizePool -= discountAmount;
            payable(msg.sender).transfer(discountAmount);
        }

        game.players[msg.sender] = true;
        game.playerList.push(msg.sender);
        playerGames[msg.sender].push(gameId);

        yieldVault.depositToYield(game.totalPrizePool, 0);

        emit GameCreated(gameId, GameMode.Scheduled, msg.sender, entryFee, maxPlayers, startTime);
        emit PlayerJoined(gameId, msg.sender, entryFee);

        return gameId;
    }

    /**
     * @notice Create a Private Room
     * @param entryFee Entry fee in native token
     * @param maxPlayers Maximum number of players
     */
    function createPrivateRoom(
        uint256 entryFee,
        uint256 maxPlayers
    ) external payable nonReentrant returns (uint256) {
        require(entryFee >= MIN_ENTRY_FEE && entryFee <= MAX_ENTRY_FEE, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");
        require(msg.value >= entryFee, "Insufficient payment");

        uint256 gameId = _gameIdCounter.current();
        _gameIdCounter.increment();

        Game storage game = games[gameId];
        game.gameId = gameId;
        game.mode = GameMode.Private;
        game.status = GameStatus.Waiting;
        game.entryFee = entryFee;
        game.maxPlayers = maxPlayers;
        game.minPlayers = MIN_PLAYERS;
        game.startTime = block.timestamp;
        game.creator = msg.sender;
        game.totalPrizePool = entryFee;

        uint256 discount = inverseToken.getEntryFeeDiscount(msg.sender);
        if (discount > 0) {
            uint256 discountAmount = (entryFee * discount) / 100;
            game.totalPrizePool -= discountAmount;
            payable(msg.sender).transfer(discountAmount);
        }

        game.players[msg.sender] = true;
        game.playerList.push(msg.sender);
        playerGames[msg.sender].push(gameId);

        yieldVault.depositToYield(game.totalPrizePool, 0);

        emit GameCreated(gameId, GameMode.Private, msg.sender, entryFee, maxPlayers, block.timestamp);
        emit PlayerJoined(gameId, msg.sender, entryFee);

        return gameId;
    }

    // ============ Game Participation Functions ============

    /**
     * @notice Join an existing game
     * @param gameId Game ID to join
     */
    function joinGame(uint256 gameId) external payable nonReentrant validGame(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Waiting, "Game not accepting players");
        require(!game.players[msg.sender], "Already in game");
        require(game.playerList.length < game.maxPlayers, "Game full");
        require(block.timestamp < game.startTime || game.mode == GameMode.QuickPlay, "Game already started");
        
        // For scheduled games, allow joining until start time
        // For quick play, allow joining during Round 1 with premium
        if (game.mode == GameMode.Scheduled) {
            require(block.timestamp < game.startTime, "Scheduled game already started");
        }

        uint256 requiredFee = game.entryFee;
        
        // Premium for late joiners in Quick Play
        if (game.mode == GameMode.QuickPlay && game.status == GameStatus.InProgress && game.currentRound == 1) {
            requiredFee = (game.entryFee * 110) / 100; // 10% premium
        }

        require(msg.value >= requiredFee, "Insufficient payment");

        // Apply discount
        uint256 discount = inverseToken.getEntryFeeDiscount(msg.sender);
        if (discount > 0) {
            uint256 discountAmount = (requiredFee * discount) / 100;
            requiredFee -= discountAmount;
            payable(msg.sender).transfer(discountAmount);
        }

        game.players[msg.sender] = true;
        game.playerList.push(msg.sender);
        game.totalPrizePool += requiredFee;
        playerGames[msg.sender].push(gameId);

        yieldVault.depositToYield(requiredFee, 0);

        emit PlayerJoined(gameId, msg.sender, requiredFee);

        // Auto-start if minimum reached and not started
        if (game.status == GameStatus.Waiting && game.playerList.length >= game.minPlayers) {
            _startGame(gameId);
        }
    }

    /**
     * @notice Make a choice for current round
     * @param gameId Game ID
     * @param choice HEAD or TAIL
     */
    function makeChoice(uint256 gameId, Choice choice) external validGame(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");
        require(game.players[msg.sender], "Not a player");
        require(!playerInfo[gameId][msg.sender].eliminated, "Already eliminated");
        require(!playerInfo[gameId][msg.sender].hasMadeChoice, "Choice already made");

        Round storage round = game.rounds[game.currentRound];
        round.choices[msg.sender] = choice;
        round.choiceCounts[choice]++;
        playerInfo[gameId][msg.sender].hasMadeChoice = true;
        playerInfo[gameId][msg.sender].choice = choice;

        emit ChoiceMade(gameId, msg.sender, game.currentRound, choice);

        // Check if all players have made choices
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

        if (choicesMade == activePlayers && activePlayers > 1) {
            _requestVRF(gameId);
        }
    }

    // ============ Internal Functions ============

    /**
     * @notice Start a game
     */
    function _startGame(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Waiting, "Game already started");
        require(game.playerList.length >= game.minPlayers, "Not enough players");

        game.status = GameStatus.InProgress;
        game.currentRound = 1;

        // Initialize first round
        Round storage round = game.rounds[1];
        round.roundNumber = 1;
    }

    /**
     * @notice Request VRF for random outcome
     */
    function _requestVRF(uint256 gameId) internal {
        uint256 requestId = vrfCoordinator.requestRandomWords(
            vrfKeyHash,
            vrfSubscriptionId,
            vrfRequestConfirmations,
            vrfCallbackGasLimit,
            1 // numWords
        );
        vrfRequestToGameId[requestId] = gameId;
    }

    /**
     * @notice VRF callback to process round
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 gameId = vrfRequestToGameId[requestId];
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");

        Round storage round = game.rounds[game.currentRound];
        require(!round.processed, "Round already processed");

        // Determine winning choice (0 = Head, 1 = Tail)
        Choice winningChoice = randomWords[0] % 2 == 0 ? Choice.Head : Choice.Tail;
        round.winningChoice = winningChoice;

        // Find minority (opposite of winning choice)
        Choice minorityChoice = winningChoice == Choice.Head ? Choice.Tail : Choice.Head;
        uint256 minorityCount = round.choiceCounts[minorityChoice];
        uint256 majorityCount = round.choiceCounts[winningChoice];

        // If tie, eliminate randomly
        if (minorityCount == majorityCount) {
            // In case of tie, eliminate the choice that matches the random outcome
            minorityChoice = winningChoice;
            minorityCount = majorityCount;
        }

        // Eliminate majority, keep minority
        for (uint256 i = 0; i < game.playerList.length; i++) {
            address player = game.playerList[i];
            if (!playerInfo[gameId][player].eliminated) {
                if (round.choices[player] == minorityChoice) {
                    round.survivors.push(player);
                } else {
                    playerInfo[gameId][player].eliminated = true;
                    playerInfo[gameId][player].roundEliminated = game.currentRound;
                }
            }
        }

        round.processed = true;

        uint256 eliminatedCount = game.playerList.length - round.survivors.length;
        emit RoundProcessed(gameId, game.currentRound, winningChoice, eliminatedCount, round.survivors.length);

        // Check if game is complete
        if (round.survivors.length == 1) {
            _completeGame(gameId, round.survivors[0]);
        } else if (round.survivors.length > 1) {
            // Start next round
            game.currentRound++;
            Round storage nextRound = game.rounds[game.currentRound];
            nextRound.roundNumber = game.currentRound;
            
            // Reset choices for next round
            for (uint256 i = 0; i < round.survivors.length; i++) {
                playerInfo[gameId][round.survivors[i]].hasMadeChoice = false;
            }
        }
    }

    /**
     * @notice Complete game and declare winner
     */
    function _completeGame(uint256 gameId, address winner) internal {
        Game storage game = games[gameId];
        game.status = GameStatus.Completed;
        game.winner = winner;

        // Get accumulated yield
        uint256 yieldAmount = yieldVault.getAccumulatedYield(gameId);
        game.yieldAccumulated = yieldAmount;

        // Distribute yield to winner
        yieldVault.distributeYield(gameId, winner);
        game.yieldDistributed = true;

        // Calculate platform fee
        uint256 platformFee = (game.totalPrizePool * platformFeeBps) / 10000;
        uint256 winnerPrize = game.totalPrizePool - platformFee;

        // Transfer winnings to winner
        payable(winner).transfer(winnerPrize);
        payable(owner()).transfer(platformFee);

        // Mint achievement NFT
        nftAchievements.mintAchievement(winner, 0, gameId); // 0 = First Win achievement

        emit GameCompleted(gameId, winner, game.totalPrizePool + yieldAmount, yieldAmount);
    }

    // ============ View Functions ============

    /**
     * @notice Get game details
     */
    function getGame(uint256 gameId) external view validGame(gameId) returns (
        uint256 gameId_,
        GameMode mode,
        GameStatus status,
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 minPlayers,
        uint256 startTime,
        uint256 currentRound,
        address creator,
        address winner,
        uint256 totalPrizePool,
        uint256 yieldAccumulated,
        uint256 playerCount
    ) {
        Game storage game = games[gameId];
        return (
            game.gameId,
            game.mode,
            game.status,
            game.entryFee,
            game.maxPlayers,
            game.minPlayers,
            game.startTime,
            game.currentRound,
            game.creator,
            game.winner,
            game.totalPrizePool,
            game.yieldAccumulated,
            game.playerList.length
        );
    }

    /**
     * @notice Get player list for a game
     */
    function getGamePlayers(uint256 gameId) external view validGame(gameId) returns (address[] memory) {
        return games[gameId].playerList;
    }

    /**
     * @notice Get player info for a game
     */
    function getPlayerInfo(uint256 gameId, address player) external view returns (PlayerInfo memory) {
        return playerInfo[gameId][player];
    }

    /**
     * @notice Get round details
     */
    function getRound(uint256 gameId, uint256 roundNumber) external view returns (
        uint256 roundNumber_,
        Choice winningChoice,
        uint256 headCount,
        uint256 tailCount,
        address[] memory survivors,
        bool processed
    ) {
        Round storage round = games[gameId].rounds[roundNumber];
        return (
            round.roundNumber,
            round.winningChoice,
            round.choiceCounts[Choice.Head],
            round.choiceCounts[Choice.Tail],
            round.survivors,
            round.processed
        );
    }

    /**
     * @notice Get player's choice for a round
     */
    function getPlayerChoice(uint256 gameId, address player, uint256 roundNumber) external view returns (Choice) {
        return games[gameId].rounds[roundNumber].choices[player];
    }

    // ============ Admin Functions ============

    /**
     * @notice Set platform fee (in basis points)
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = newFeeBps;
    }

    /**
     * @notice Update VRF settings
     */
    function setVRFSettings(
        uint64 subscriptionId,
        bytes32 keyHash,
        uint32 callbackGasLimit,
        uint16 requestConfirmations
    ) external onlyOwner {
        vrfSubscriptionId = subscriptionId;
        vrfKeyHash = keyHash;
        vrfCallbackGasLimit = callbackGasLimit;
        vrfRequestConfirmations = requestConfirmations;
    }

    /**
     * @notice Update contract addresses
     */
    function updateContracts(
        address _yieldVault,
        address _inverseToken,
        address _nftAchievements
    ) external onlyOwner {
        yieldVault = IYieldVault(_yieldVault);
        inverseToken = IInverseToken(_inverseToken);
        nftAchievements = INFTAchievements(_nftAchievements);
    }

    /**
     * @notice Emergency cancel game (only if no players have made choices)
     */
    function cancelGame(uint256 gameId) external onlyOwner validGame(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Waiting || 
                (game.status == GameStatus.InProgress && game.currentRound == 1 && !game.rounds[1].processed),
                "Cannot cancel game");
        
        game.status = GameStatus.Cancelled;
        
        // Refund all players
        for (uint256 i = 0; i < game.playerList.length; i++) {
            payable(game.playerList[i]).transfer(game.entryFee);
        }
    }

    /**
     * @notice Withdraw contract balance (emergency only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
