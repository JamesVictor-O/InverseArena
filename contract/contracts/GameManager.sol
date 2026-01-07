// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "chainlink-brownie-contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "chainlink-brownie-contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "./interfaces/IYieldVault.sol";
import "./interfaces/INFTAchievements.sol";


contract GameManager is Ownable, ReentrancyGuard, VRFConsumerBaseV2 {
    using SafeERC20 for IERC20;
    
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

    enum Currency {
        MNT,            
        USDT0,          
        METH            
    }

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
        uint256 currentRound;
        address creator;
        address winner;
        uint256 totalPrizePool;
        uint256 yieldAccumulated;
        uint8 yieldProtocol;       
        bool yieldDistributed;
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

 

    IYieldVault public yieldVault;
    INFTAchievements public nftAchievements;
    VRFCoordinatorV2Interface public vrfCoordinator;

    uint64 public vrfSubscriptionId;
    bytes32 public vrfKeyHash;
    uint32 public vrfCallbackGasLimit = 500000;
    uint16 public vrfRequestConfirmations = 3;

   
    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(uint256 => Round)) public rounds;
    mapping(uint256 => uint256) public vrfRequestToGameId;
    mapping(address => uint256[]) public playerGames;
    mapping(uint256 => mapping(address => PlayerInfo)) public playerInfo;

    
    address public USDT0;
    address public mETH;
    uint256 public platformFeeBps = 500; // 5%
    uint256 public constant MIN_ENTRY_FEE = 0.001 ether;
    uint256 public constant MAX_ENTRY_FEE = 100 ether;
    uint256 public constant MIN_PLAYERS = 4;
    uint256 public constant MAX_PLAYERS = 20;

    GameStats public stats;
    uint256 private _gameIdCounter;

 

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
        address _vrfCoordinator,
        uint64 _vrfSubscriptionId,
        bytes32 _vrfKeyHash,
        address _usdt0,
        address _mETH
    ) VRFConsumerBaseV2(_vrfCoordinator) Ownable(msg.sender) {
        yieldVault = IYieldVault(_yieldVault);
        nftAchievements = INFTAchievements(_nftAchievements);
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        vrfSubscriptionId = _vrfSubscriptionId;
        vrfKeyHash = _vrfKeyHash;
        
        USDT0 = _usdt0;
        mETH = _mETH;
    }

    // ============ Game Creation Functions ============

    /**
     * @notice Create Quick Play game with USDT0 (PRIMARY CURRENCY)
     * @param entryFee Entry fee in USDT0
     * @param maxPlayers Maximum players (4-20)
     */
    function createQuickPlayGameUSDT0(
        uint256 entryFee,
        uint256 maxPlayers
    ) external nonReentrant returns (uint256) {
        require(entryFee >= MIN_ENTRY_FEE && entryFee <= MAX_ENTRY_FEE, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");

        // Transfer USDT0 from creator
        IERC20(USDT0).safeTransferFrom(msg.sender, address(this), entryFee);

        uint256 gameId = _createGame(
            GameMode.QuickPlay,
            Currency.USDT0,
            USDT0,
            entryFee,
            maxPlayers,
            block.timestamp
        );

        // Deposit to yield vault (USDT0 protocol)
        IERC20(USDT0).forceApprove(address(yieldVault), entryFee);
        yieldVault.depositUSDT0(gameId, entryFee);
        games[gameId].yieldProtocol = 1; // PROTOCOL_USDT0

        emit GameCreated(gameId, GameMode.QuickPlay, Currency.USDT0, msg.sender, entryFee, maxPlayers, block.timestamp);
        emit PlayerJoined(gameId, msg.sender, entryFee, Currency.USDT0);

        return gameId;
    }

    /**
     * @notice Create Quick Play game with mETH
     * @param entryFee Entry fee in mETH
     * @param maxPlayers Maximum players
     */
    function createQuickPlayGameMETH(
        uint256 entryFee,
        uint256 maxPlayers
    ) external nonReentrant returns (uint256) {
        require(entryFee >= MIN_ENTRY_FEE && entryFee <= MAX_ENTRY_FEE, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");

        IERC20(mETH).safeTransferFrom(msg.sender, address(this), entryFee);

        uint256 gameId = _createGame(
            GameMode.QuickPlay,
            Currency.METH,
            mETH,
            entryFee,
            maxPlayers,
            block.timestamp
        );

        // Deposit to yield vault (mETH protocol)
        IERC20(mETH).forceApprove(address(yieldVault), entryFee);
        yieldVault.depositMETH(gameId, entryFee);
        games[gameId].yieldProtocol = 0; // PROTOCOL_METH

        emit GameCreated(gameId, GameMode.QuickPlay, Currency.METH, msg.sender, entryFee, maxPlayers, block.timestamp);
        emit PlayerJoined(gameId, msg.sender, entryFee, Currency.METH);

        return gameId;
    }

    /**
     * @notice Create Quick Play game with native MNT (legacy support)
     */
    function createQuickPlayGame(
        uint256 entryFee,
        uint256 maxPlayers
    ) external payable nonReentrant returns (uint256) {
        require(entryFee >= MIN_ENTRY_FEE && entryFee <= MAX_ENTRY_FEE, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");
        require(msg.value >= entryFee, "Insufficient payment");

        uint256 gameId = _createGame(
            GameMode.QuickPlay,
            Currency.MNT,
            address(0),
            entryFee,
            maxPlayers,
            block.timestamp
        );

        // Deposit to yield vault
        yieldVault.depositToYield{value: entryFee}(entryFee, 0);

        emit GameCreated(gameId, GameMode.QuickPlay, Currency.MNT, msg.sender, entryFee, maxPlayers, block.timestamp);
        emit PlayerJoined(gameId, msg.sender, entryFee, Currency.MNT);

        return gameId;
    }

    /**
     * @notice Create Scheduled Tournament (USDT0)
     * @param startTime Unix timestamp for game start
     * @param entryFee Entry fee in USDT0
     * @param maxPlayers Maximum players
     */
    function createScheduledTournamentUSDT0(
        uint256 startTime,
        uint256 entryFee,
        uint256 maxPlayers
    ) external nonReentrant returns (uint256) {
        require(startTime > block.timestamp, "Start time must be in future");
        require(entryFee >= MIN_ENTRY_FEE && entryFee <= MAX_ENTRY_FEE, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");

        IERC20(USDT0).safeTransferFrom(msg.sender, address(this), entryFee);

        uint256 gameId = _createGame(
            GameMode.Scheduled,
            Currency.USDT0,
            USDT0,
            entryFee,
            maxPlayers,
            startTime
        );

        IERC20(USDT0).forceApprove(address(yieldVault), entryFee);
        yieldVault.depositUSDT0(gameId, entryFee);
        games[gameId].yieldProtocol = 1;

        emit GameCreated(gameId, GameMode.Scheduled, Currency.USDT0, msg.sender, entryFee, maxPlayers, startTime);
        emit PlayerJoined(gameId, msg.sender, entryFee, Currency.USDT0);

        return gameId;
    }

    /**
     * @notice Create Private Room (supports all currencies)
     */
    function createPrivateRoom(
        Currency currency,
        uint256 entryFee,
        uint256 maxPlayers
    ) external payable nonReentrant returns (uint256) {
        require(entryFee >= MIN_ENTRY_FEE && entryFee <= MAX_ENTRY_FEE, "Invalid entry fee");
        require(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, "Invalid player count");

        address currencyAddress = _getCurrencyAddress(currency);
        
        if (currency == Currency.MNT) {
            require(msg.value >= entryFee, "Insufficient payment");
        } else {
            IERC20(currencyAddress).safeTransferFrom(msg.sender, address(this), entryFee);
        }

        uint256 gameId = _createGame(
            GameMode.Private,
            currency,
            currencyAddress,
            entryFee,
            maxPlayers,
            block.timestamp
        );

        _depositToYieldVault(gameId, currency, entryFee);

        emit GameCreated(gameId, GameMode.Private, currency, msg.sender, entryFee, maxPlayers, block.timestamp);
        emit PlayerJoined(gameId, msg.sender, entryFee, currency);

        return gameId;
    }

    // ============ Game Participation ============

    /**
     * @notice Join an existing game
     * @param gameId Game ID to join
     */
    function joinGame(uint256 gameId) external payable nonReentrant validGame(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Waiting, "Game not accepting players");
        require(!_isPlayerInGame(gameId, msg.sender), "Already in game");
        require(game.playerList.length < game.maxPlayers, "Game full");
        
        uint256 requiredFee = game.entryFee;

        // Transfer payment based on currency
        if (game.currency == Currency.MNT) {
            require(msg.value >= requiredFee, "Insufficient payment");
        } else {
            IERC20(game.currencyAddress).safeTransferFrom(msg.sender, address(this), requiredFee);
        }

        // Add player
        game.playerList.push(msg.sender);
        game.totalPrizePool += requiredFee;
        playerGames[msg.sender].push(gameId);
        
        playerInfo[gameId][msg.sender] = PlayerInfo({
            isPlaying: true,
            hasMadeChoice: false,
            choice: Choice.Head,
            eliminated: false,
            roundEliminated: 0,
            entryAmount: requiredFee
        });

 
        _depositToYieldVault(gameId, game.currency, requiredFee);

        emit PlayerJoined(gameId, msg.sender, requiredFee, game.currency);

        // Auto-start if minimum reached
        if (game.status == GameStatus.Waiting && game.playerList.length >= game.minPlayers) {
            if (game.mode == GameMode.QuickPlay || 
                (game.mode == GameMode.Scheduled && block.timestamp >= game.startTime)) {
                _startGame(gameId);
            }
        }
    }

    /**
     * @notice Make choice for current round
     */
    function makeChoice(uint256 gameId, Choice choice) external validGame(gameId) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.InProgress, "Game not in progress");
        require(_isPlayerInGame(gameId, msg.sender), "Not a player");
        require(!playerInfo[gameId][msg.sender].eliminated, "Already eliminated");
        require(!playerInfo[gameId][msg.sender].hasMadeChoice, "Choice already made");

        Round storage round = rounds[gameId][game.currentRound];
        round.choices[msg.sender] = choice;
        round.choiceCounts[choice]++;
        playerInfo[gameId][msg.sender].hasMadeChoice = true;
        playerInfo[gameId][msg.sender].choice = choice;

        emit ChoiceMade(gameId, msg.sender, game.currentRound, choice);

    
        if (_allPlayersChosen(gameId)) {
            _requestVRF(gameId);
        }
    }

    // ============ Internal Game Logic ============

    function _createGame(
        GameMode mode,
        Currency currency,
        address currencyAddress,
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 startTime
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

        game.playerList.push(msg.sender);
        playerGames[msg.sender].push(gameId);
        
        playerInfo[gameId][msg.sender] = PlayerInfo({
            isPlaying: true,
            hasMadeChoice: false,
            choice: Choice.Head,
            eliminated: false,
            roundEliminated: 0,
            entryAmount: entryFee
        });

        stats.totalGames++;

        return gameId;
    }

    function _startGame(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Waiting, "Game already started");
        require(game.playerList.length >= game.minPlayers, "Not enough players");

        game.status = GameStatus.InProgress;
        game.currentRound = 1;

        Round storage round = rounds[gameId][1];
        round.roundNumber = 1;
        round.timestamp = block.timestamp;
    }

    function _requestVRF(uint256 gameId) internal {
        uint256 requestId = vrfCoordinator.requestRandomWords(
            vrfKeyHash,
            vrfSubscriptionId,
            vrfRequestConfirmations,
            vrfCallbackGasLimit,
            1
        );
        vrfRequestToGameId[requestId] = gameId;
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 gameId = vrfRequestToGameId[requestId];
        _processRound(gameId, randomWords[0]);
    }

    function _processRound(uint256 gameId, uint256 randomness) internal {
        Game storage game = games[gameId];
        Round storage round = rounds[gameId][game.currentRound];
        
        require(!round.processed, "Round already processed");
        require(game.status == GameStatus.InProgress, "Game not in progress");

        // Determine winning choice (minority survives)
        Choice randomChoice = randomness % 2 == 0 ? Choice.Head : Choice.Tail;
        Choice minorityChoice = round.choiceCounts[Choice.Head] < round.choiceCounts[Choice.Tail] 
            ? Choice.Head 
            : Choice.Tail;
        
        // Handle ties
        if (round.choiceCounts[Choice.Head] == round.choiceCounts[Choice.Tail]) {
            minorityChoice = randomChoice == Choice.Head ? Choice.Tail : Choice.Head;
        }

        round.winningChoice = randomChoice;

        // Eliminate majority, keep minority
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
        uint256 roundDuration = block.timestamp - round.timestamp;

        emit RoundProcessed(gameId, game.currentRound, randomChoice, eliminated, round.survivors.length, roundDuration);

        // Check game completion
        if (round.survivors.length == 1) {
            _completeGame(gameId, round.survivors[0]);
        } else if (round.survivors.length > 1) {
            // Start next round
            game.currentRound++;
            Round storage nextRound = rounds[gameId][game.currentRound];
            nextRound.roundNumber = game.currentRound;
            nextRound.timestamp = block.timestamp;
            
            // Reset choices
            for (uint256 i = 0; i < round.survivors.length; i++) {
                playerInfo[gameId][round.survivors[i]].hasMadeChoice = false;
            }

            // Emit yield snapshot
            yieldVault.emitYieldSnapshot(gameId);
        }
    }

    function _completeGame(uint256 gameId, address winner) internal {
        Game storage game = games[gameId];
        game.status = GameStatus.Completed;
        game.winner = winner;

        // Get accumulated yield
        uint256 yieldAmount = yieldVault.getAccumulatedYield(gameId);
        game.yieldAccumulated = yieldAmount;

        // Calculate platform fee (only on principal, not yield)
        uint256 platformFee = (game.totalPrizePool * platformFeeBps) / 10000;
        uint256 winnerPrize = game.totalPrizePool - platformFee;
        uint256 totalPayout = winnerPrize + yieldAmount;

        // Distribute yield through vault
        yieldVault.distributeYield(gameId, winner);
        game.yieldDistributed = true;

        // Transfer platform fee
        if (game.currency == Currency.MNT) {
            payable(owner()).transfer(platformFee);
        } else {
            IERC20(game.currencyAddress).safeTransfer(owner(), platformFee);
        }

        // Mint achievement NFT
        nftAchievements.mintAchievement(winner, 0, gameId);

        // Update stats
        stats.totalPrizePool += game.totalPrizePool;
        stats.totalYieldGenerated += yieldAmount;

        emit GameCompleted(gameId, winner, winnerPrize, yieldAmount, totalPayout, game.currency);
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

    function _getCurrencyAddress(Currency currency) internal view returns (address) {
        if (currency == Currency.USDT0) return USDT0;
        if (currency == Currency.METH) return mETH;
        return address(0); // MNT
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
            yieldVault.depositToYield{value: amount}(amount, 0);
        }
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
        uint256 playerCount
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
            game.playerList.length
        );
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

    function setTokenAddresses(address _usdt0, address _mETH) external onlyOwner {
        if (_usdt0 != address(0)) USDT0 = _usdt0;
        if (_mETH != address(0)) mETH = _mETH;
    }

    function updateContracts(address _yieldVault, address _nftAchievements) external onlyOwner {
        if (_yieldVault != address(0)) yieldVault = IYieldVault(_yieldVault);
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

    receive() external payable {}
}
