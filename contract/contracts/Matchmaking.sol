// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GameManager.sol";


contract Matchmaking is Ownable, ReentrancyGuard {
    // ============ Structs ============

    struct QueueEntry {
        address player;
        uint256 entryFee;
        uint256 timestamp;
        GameManager.GameMode preferredMode;
    }

    struct MatchmakingConfig {
        uint256 minPlayers;
        uint256 maxPlayers;
        uint256 maxWaitTime; // seconds
        uint256 autoStartThreshold;
    }

    // ============ State Variables ============

    GameManager public gameManager;

    mapping(GameManager.GameMode => QueueEntry[]) public queues;
    mapping(address => bool) public inQueue;
    mapping(address => GameManager.GameMode) public playerQueueMode;
    mapping(GameManager.GameMode => MatchmakingConfig) public configs;

    uint256 public constant DEFAULT_MIN_PLAYERS = 4;
    uint256 public constant DEFAULT_MAX_PLAYERS = 20;
    uint256 public constant DEFAULT_MAX_WAIT_TIME = 30; // 30 seconds
    uint256 public constant DEFAULT_AUTO_START_THRESHOLD = 4;

    // ============ Events ============

    event PlayerQueued(
        address indexed player,
        GameManager.GameMode mode,
        uint256 entryFee
    );

    event PlayerDequeued(
        address indexed player,
        GameManager.GameMode mode
    );

    event MatchCreated(
        uint256 indexed gameId,
        address[] players,
        GameManager.GameMode mode
    );

    event ConfigUpdated(
        GameManager.GameMode mode,
        MatchmakingConfig config
    );

    // ============ Constructor ============

    constructor(address _gameManager) Ownable(msg.sender) {
        gameManager = GameManager(payable(_gameManager));

        // Initialize default configs
        configs[GameManager.GameMode.QuickPlay] = MatchmakingConfig({
            minPlayers: DEFAULT_MIN_PLAYERS,
            maxPlayers: DEFAULT_MAX_PLAYERS,
            maxWaitTime: DEFAULT_MAX_WAIT_TIME,
            autoStartThreshold: DEFAULT_AUTO_START_THRESHOLD
        });

        configs[GameManager.GameMode.Scheduled] = MatchmakingConfig({
            minPlayers: DEFAULT_MIN_PLAYERS,
            maxPlayers: DEFAULT_MAX_PLAYERS,
            maxWaitTime: 3600, // 1 hour for scheduled
            autoStartThreshold: DEFAULT_AUTO_START_THRESHOLD
        });

        configs[GameManager.GameMode.Private] = MatchmakingConfig({
            minPlayers: DEFAULT_MIN_PLAYERS,
            maxPlayers: DEFAULT_MAX_PLAYERS,
            maxWaitTime: 300, // 5 minutes for private
            autoStartThreshold: DEFAULT_AUTO_START_THRESHOLD
        });
    }

    // ============ External Functions ============

    /**
     * @notice Add player to matchmaking queue
     * @param mode Preferred game mode
     * @param entryFee Desired entry fee
     */
    function addToQueue(
        GameManager.GameMode mode,
        uint256 entryFee
    ) external payable nonReentrant {
        require(!inQueue[msg.sender], "Already in queue");
        require(msg.value >= entryFee, "Insufficient payment");

        queues[mode].push(QueueEntry({
            player: msg.sender,
            entryFee: entryFee,
            timestamp: block.timestamp,
            preferredMode: mode
        }));

        inQueue[msg.sender] = true;
        playerQueueMode[msg.sender] = mode;

        emit PlayerQueued(msg.sender, mode, entryFee);

        _tryMatchPlayers(mode);
    }

    /**
     * @notice Remove player from queue
     */
    function removeFromQueue() external nonReentrant {
        require(inQueue[msg.sender], "Not in queue");

        GameManager.GameMode mode = playerQueueMode[msg.sender];
        QueueEntry[] storage queue = queues[mode];
        for (uint256 i = 0; i < queue.length; i++) {
            if (queue[i].player == msg.sender) {
                payable(msg.sender).transfer(queue[i].entryFee);

                queue[i] = queue[queue.length - 1];
                queue.pop();

                break;
            }
        }

        inQueue[msg.sender] = false;
        delete playerQueueMode[msg.sender];

        emit PlayerDequeued(msg.sender, mode);
    }

    /**
     * @notice Match players and create game
     * @param mode Game mode to match
     */
    function matchPlayers(GameManager.GameMode mode) external {
        _tryMatchPlayers(mode);
    }

    /**
     * @notice Estimate wait time for a game mode
     * @param mode Game mode
     * @return waitTime Estimated wait time in seconds
     */
    function estimateWaitTime(
        GameManager.GameMode mode
    ) external view returns (uint256 waitTime) {
        MatchmakingConfig memory config = configs[mode];
        uint256 queueLength = queues[mode].length;

        if (queueLength >= config.autoStartThreshold) {
            return 0; // Can start immediately
        }

        // Estimate based on historical data (simplified)
        // In production, this would use actual historical matchmaking data
        uint256 playersNeeded = config.autoStartThreshold - queueLength;
        uint256 avgTimePerPlayer = 5; // 5 seconds average per player

        return playersNeeded * avgTimePerPlayer;
    }

    function getQueueStatus(
        GameManager.GameMode mode
    ) external view returns (
        uint256 queueLength,
        uint256 minPlayers,
        uint256 maxPlayers,
        uint256 estimatedWaitTime
    ) {
        MatchmakingConfig memory config = configs[mode];
        return (
            queues[mode].length,
            config.minPlayers,
            config.maxPlayers,
            this.estimateWaitTime(mode)
        );
    }

    function getQueuePlayers(
        GameManager.GameMode mode
    ) external view returns (address[] memory players) {
        QueueEntry[] memory queue = queues[mode];
        players = new address[](queue.length);
        for (uint256 i = 0; i < queue.length; i++) {
            players[i] = queue[i].player;
        }
        return players;
    }


    function _tryMatchPlayers(GameManager.GameMode mode) internal {
        QueueEntry[] storage queue = queues[mode];
        MatchmakingConfig memory config = configs[mode];

        if (queue.length < config.autoStartThreshold) {
            return;
        }
        address[] memory matchedPlayers = new address[](config.maxPlayers);
        uint256[] memory entryFees = new uint256[](config.maxPlayers);
        uint256 matchedCount = 0;
        uint256 baseEntryFee = queue[0].entryFee;

        for (uint256 i = 0; i < queue.length && matchedCount < config.maxPlayers; i++) {
            QueueEntry memory entry = queue[i];
            
            // Check if entry fee is within tolerance
            uint256 feeDiff = entry.entryFee > baseEntryFee 
                ? entry.entryFee - baseEntryFee 
                : baseEntryFee - entry.entryFee;
            uint256 tolerance = (baseEntryFee * 10) / 100; // 10% tolerance

            if (feeDiff <= tolerance) {
                matchedPlayers[matchedCount] = entry.player;
                entryFees[matchedCount] = entry.entryFee;
                matchedCount++;
            }
        }

        if (matchedCount >= config.minPlayers) {
            uint256 medianEntryFee = _calculateMedian(entryFees, matchedCount);
            uint256 gameId;
            
            // Generate game name based on mode
            string memory gameName;
            if (mode == GameManager.GameMode.QuickPlay) {
                gameName = "Quick Play Match";
                gameId = gameManager.createQuickPlayGame{value: 0}(gameName, medianEntryFee, matchedCount);
            } else if (mode == GameManager.GameMode.Scheduled) {
                gameName = "Scheduled Tournament";
                gameId = gameManager.createPrivateRoom(gameName, GameManager.Currency.MNT, medianEntryFee, matchedCount);
            } else {
                gameName = "Private Room";
                gameId = gameManager.createPrivateRoom(gameName, GameManager.Currency.MNT, medianEntryFee, matchedCount);
            }

            address[] memory playersToRemove = new address[](matchedCount);
            for (uint256 i = 0; i < matchedCount; i++) {
                playersToRemove[i] = matchedPlayers[i];
                inQueue[matchedPlayers[i]] = false;
                delete playerQueueMode[matchedPlayers[i]];
                gameManager.joinGame{value: entryFees[i]}(gameId);
            }

            // Remove from queue array
            for (uint256 i = 0; i < queue.length; i++) {
                bool shouldRemove = false;
                for (uint256 j = 0; j < matchedCount; j++) {
                    if (queue[i].player == playersToRemove[j]) {
                        shouldRemove = true;
                        break;
                    }
                }
                if (shouldRemove) {
                    queue[i] = queue[queue.length - 1];
                    queue.pop();
                    i--; // Adjust index after removal
                }
            }

            emit MatchCreated(gameId, matchedPlayers, mode);
        }
    }

    /**
     * @notice Calculate median of an array
     */
    function _calculateMedian(
        uint256[] memory values,
        uint256 length
    ) internal pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < length; i++) {
            sum += values[i];
        }
        return sum / length;
    }

 
    function updateConfig(
        GameManager.GameMode mode,
        MatchmakingConfig memory config
    ) external onlyOwner {
        require(config.minPlayers >= 2, "Min players too low");
        require(config.maxPlayers <= 20, "Max players too high");
        require(config.minPlayers <= config.maxPlayers, "Invalid player range");

        configs[mode] = config;
        emit ConfigUpdated(mode, config);
    }

    /**
     * @notice Update game manager address
     */
    function setGameManager(address _gameManager) external onlyOwner {
        gameManager = GameManager(payable(_gameManager));
    }

    /**
     * @notice Emergency: clear queue for a mode
     */
    function clearQueue(GameManager.GameMode mode) external onlyOwner {
        QueueEntry[] storage queue = queues[mode];
        
        // Refund all players
        for (uint256 i = 0; i < queue.length; i++) {
            payable(queue[i].player).transfer(queue[i].entryFee);
            inQueue[queue[i].player] = false;
            delete playerQueueMode[queue[i].player];
        }

        delete queues[mode];
    }

    /**
     * @notice Emergency withdraw
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @notice Receive native tokens
     */
    receive() external payable {
        // Allow contract to receive ETH
    }
}
