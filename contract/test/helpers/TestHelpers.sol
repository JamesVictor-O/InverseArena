// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {GameManager} from "../../contracts/GameManager.sol";
import {YieldVault} from "../../contracts/YieldVault.sol";
import {NFTAchievements} from "../../contracts/NFTAchievements.sol";
import {Matchmaking} from "../../contracts/Matchmaking.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

/**
 * @title TestHelpers
 * @notice Helper contract with common test utilities for GameManager tests
 */
contract TestHelpers is Test {
    GameManager public gameManager;
    YieldVault public yieldVault;
    NFTAchievements public nftAchievements;
    Matchmaking public matchmaking;
    MockERC20 public usdt0;
    MockERC20 public mETH;

    address public owner;
    address public player1;
    address public player2;
    address public player3;
    address public player4;
    address public player5;

    uint256 public constant MIN_PLAYERS = 4;
    uint256 public constant MIN_CREATOR_STAKE = 30 * 10**6; // 30 USDT (6 decimals)

    function setUp() public virtual {
        // Set up test addresses
        // Note: Avoid addresses 0x1-0x9 (precompiles) which can't be used for regular transactions
        owner = address(this);
        player1 = address(0x10);
        player2 = address(0x11);
        player3 = address(0x12);
        player4 = address(0x13);
        player5 = address(0x14);

        // Deploy mock tokens
        usdt0 = new MockERC20("Mock USDT0", "USDT0", 6);
        mETH = new MockERC20("Mock mETH", "mETH", 18);

        // Deploy core contracts
        nftAchievements = new NFTAchievements();
        yieldVault = new YieldVault(
            address(usdt0),
            address(mETH),
            address(0), // lendle
            address(0)  // aurelius
        );
        
        gameManager = new GameManager(
            address(yieldVault),
            address(nftAchievements),
            address(usdt0),
            address(mETH)
        );

        // Deploy Matchmaking contract
        matchmaking = new Matchmaking(address(gameManager));

        // Set GameManager in YieldVault
        yieldVault.setGameManager(address(gameManager));

        // Authorize GameManager to mint NFTs
        nftAchievements.setAuthorizedMinter(address(gameManager), true);

        // Fund test accounts with tokens and ETH
        _fundAccount(player1);
        _fundAccount(player2);
        _fundAccount(player3);
        _fundAccount(player4);
        _fundAccount(player5);
    }

    /**
     * @notice Fund an account with test tokens and ETH
     * @param account Address to fund
     */
    function _fundAccount(address account) internal {
        // Give ETH for gas and MNT games
        vm.deal(account, 100 ether);
        
        // Give USDT0 tokens
        usdt0.mint(account, 1000000 * 10**6); // 1M USDT0
        
        // Give mETH tokens
        mETH.mint(account, 1000 ether); // 1000 mETH
    }

    /**
     * @notice Helper to stake as creator for testing
     * @param creator Address to stake for
     */
    function stakeAsCreatorFor(address creator) internal {
        vm.startPrank(creator);
        
        // Approve USDT0 for staking
        usdt0.approve(address(gameManager), MIN_CREATOR_STAKE);
        
        // Stake to become creator
        gameManager.stakeAsCreator(MIN_CREATOR_STAKE);
        
        vm.stopPrank();
    }

    /**
     * @notice Create a game with minimum players already joined and started
     * @param currency The currency to use for the game
     * @param entryFee Entry fee amount
     * @param maxPlayers Maximum players for the game
     * @return gameId The created game ID
     */
    function createGameWithMinPlayers(
        GameManager.Currency currency,
        uint256 entryFee,
        uint256 maxPlayers
    ) internal returns (uint256) {
        // Stake as creator for player1
        stakeAsCreatorFor(player1);

        uint256 gameId;

        // Create game with player1
        if (currency == GameManager.Currency.MNT) {
            vm.prank(player1);
            gameId = gameManager.createQuickPlayGame{value: entryFee}(
                "Test Game",
                entryFee,
                maxPlayers
            );
        } else if (currency == GameManager.Currency.USDT0) {
            vm.startPrank(player1);
            usdt0.approve(address(gameManager), entryFee);
            gameId = gameManager.createQuickPlayGameUSDT0(
                "Test Game USDT0",
                entryFee,
                maxPlayers
            );
            vm.stopPrank();
        } else if (currency == GameManager.Currency.METH) {
            vm.startPrank(player1);
            mETH.approve(address(gameManager), entryFee);
            gameId = gameManager.createQuickPlayGameMETH(
                "Test Game METH",
                entryFee,
                maxPlayers
            );
            vm.stopPrank();
        }

        // Join with remaining players to reach minimum
        address[3] memory players = [player2, player3, player4];
        
        for (uint256 i = 0; i < MIN_PLAYERS - 1; i++) {
            if (currency == GameManager.Currency.MNT) {
                vm.prank(players[i]);
                gameManager.joinGame{value: entryFee}(gameId);
            } else if (currency == GameManager.Currency.USDT0) {
                vm.startPrank(players[i]);
                usdt0.approve(address(gameManager), entryFee);
                gameManager.joinGame(gameId);
                vm.stopPrank();
            } else if (currency == GameManager.Currency.METH) {
                vm.startPrank(players[i]);
                mETH.approve(address(gameManager), entryFee);
                gameManager.joinGame(gameId);
                vm.stopPrank();
            }
        }

        // ✅ New logic: After min players join, countdown starts
        // Fast forward past countdown and start the game
        (, , GameManager.GameStatus status, , , , , , , , ,) = gameManager.getGame(gameId);
        if (status == GameManager.GameStatus.Countdown) {
            // Fast forward 1 minute + 1 second past countdown deadline
            vm.warp(block.timestamp + 61 seconds);
            // Start the game after countdown (anyone can call this)
            gameManager.startGameAfterCountdown(gameId);
        }

        return gameId;
    }

    /**
     * @notice Helper to create a game with min players and start it (maintains backward compatibility)
     * @param currency The currency to use for the game
     * @param entryFee Entry fee amount
     * @param maxPlayers Maximum players for the game
     * @return gameId The created game ID (in InProgress state)
     */
    function createAndStartGame(
        GameManager.Currency currency,
        uint256 entryFee,
        uint256 maxPlayers
    ) internal returns (uint256) {
        return createGameWithMinPlayers(currency, entryFee, maxPlayers);
    }

    /**
     * @notice Helper to create a complete game scenario with choices made
     * @param currency Currency to use
     * @param entryFee Entry fee amount
     * @param headChoices Number of players choosing Head (rest choose Tail)
     * @return gameId The created game ID
     */
    function createGameWithChoices(
        GameManager.Currency currency,
        uint256 entryFee,
        uint256 headChoices
    ) internal returns (uint256) {
        require(headChoices <= MIN_PLAYERS, "Too many head choices");
        
        uint256 gameId = createGameWithMinPlayers(currency, entryFee, 10);
        
        address[4] memory players = [player1, player2, player3, player4];
        
        // Make choices
        for (uint256 i = 0; i < MIN_PLAYERS; i++) {
            GameManager.Choice choice = i < headChoices 
                ? GameManager.Choice.Head 
                : GameManager.Choice.Tail;
                
            vm.prank(players[i]);
            gameManager.makeChoice(gameId, choice);
        }
        
        return gameId;
    }

    /**
     * @notice Get active (non-eliminated) player count for a game
     * @param gameId Game ID to check
     * @return count Number of active players
     */
    function getActivePlayerCount(uint256 gameId) internal view returns (uint256) {
        address[] memory players = gameManager.getGamePlayers(gameId);
        uint256 count = 0;
        
        for (uint256 i = 0; i < players.length; i++) {
            GameManager.PlayerInfo memory info = gameManager.getPlayerInfo(gameId, players[i]);
            if (!info.eliminated) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * @notice Assert that a player is eliminated
     * @param gameId Game ID
     * @param player Player address
     */
    function assertPlayerEliminated(uint256 gameId, address player) internal view {
        GameManager.PlayerInfo memory info = gameManager.getPlayerInfo(gameId, player);
        assertTrue(info.eliminated, "Player should be eliminated");
        assertGt(info.roundEliminated, 0, "Round eliminated should be set");
    }

    /**
     * @notice Assert that a player is still active
     * @param gameId Game ID
     * @param player Player address
     */
    function assertPlayerActive(uint256 gameId, address player) internal view {
        GameManager.PlayerInfo memory info = gameManager.getPlayerInfo(gameId, player);
        assertFalse(info.eliminated, "Player should be active");
        assertEq(info.roundEliminated, 0, "Round eliminated should be 0");
    }
}
