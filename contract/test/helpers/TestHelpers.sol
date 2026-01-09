// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GameManager} from "../../contracts/GameManager.sol";
import {YieldVault} from "../../contracts/YieldVault.sol";
import {NFTAchievements} from "../../contracts/NFTAchievements.sol";
import {Matchmaking} from "../../contracts/Matchmaking.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

/**
 * @title TestHelpers
 * @notice Helper contract for setting up test environment
 */
contract TestHelpers is Test {
    // Contracts
    GameManager public gameManager;
    YieldVault public yieldVault;
    NFTAchievements public nftAchievements;
    Matchmaking public matchmaking;
    MockERC20 public usdt0;
    MockERC20 public mETH;

    // Test addresses
    address public owner = address(1);
    address public player1 = address(2);
    address public player2 = address(3);
    address public player3 = address(4);
    address public player4 = address(5);
    address public player5 = address(6);
    address public player6 = address(7);
    address public player7 = address(8);
    address public player8 = address(9);

    // Constants
    uint256 public constant ENTRY_FEE = 0.01 ether;
    uint256 public constant MIN_PLAYERS = 4;
    uint256 public constant MAX_PLAYERS = 20;

    // Events
    event GameCreated(uint256 indexed gameId, address indexed creator, GameManager.GameMode mode);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event ChoiceMade(uint256 indexed gameId, address indexed player, GameManager.Choice choice);
    event RoundProcessed(uint256 indexed gameId, uint256 roundNumber, GameManager.Choice winningChoice);
    event GameCompleted(uint256 indexed gameId, address indexed winner, uint256 prizePool, uint256 yield);

    function setUp() public virtual {
        vm.startPrank(owner);

        // Deploy mock tokens
        usdt0 = new MockERC20("USDT0", "USDT0", 6);
        mETH = new MockERC20("mETH", "mETH", 18);

        // Deploy YieldVault
        yieldVault = new YieldVault(
            address(usdt0),
            address(mETH),
            address(0), // aavePool
            address(0)  // MNT (native)
        );

        // Deploy NFTAchievements
        nftAchievements = new NFTAchievements();

        // Deploy GameManager (no VRF needed - uses block-based randomness)
        gameManager = new GameManager(
            address(yieldVault),
            address(nftAchievements),
            address(usdt0),
            address(mETH)
        );

        // Authorize GameManager to mint NFTs
        nftAchievements.setAuthorizedMinter(address(gameManager), true);

        // Deploy Matchmaking
        matchmaking = new Matchmaking(address(gameManager));

        vm.stopPrank();

        // Fund test accounts with native tokens
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        vm.deal(player3, 100 ether);
        vm.deal(player4, 100 ether);
        vm.deal(player5, 100 ether);
        vm.deal(player6, 100 ether);
        vm.deal(player7, 100 ether);
        vm.deal(player8, 100 ether);

        // Fund test accounts with ERC20 tokens
        // USDT0 uses 6 decimals
        // Contract requires entryFee >= 10^15 (MIN_ENTRY_FEE) in raw units
        // So we need at least 10^15 USDT0 units per game
        // Mint enough for many games: 100 * 10^15 = 100,000,000,000,000,000 USDT0 units
        uint256 usdt0Amount = 100 * 10**15; // 100 games worth
        usdt0.mint(player1, usdt0Amount);
        usdt0.mint(player2, usdt0Amount);
        usdt0.mint(player3, usdt0Amount);
        usdt0.mint(player4, usdt0Amount);
        usdt0.mint(player5, usdt0Amount);
        usdt0.mint(player6, usdt0Amount);
        usdt0.mint(player7, usdt0Amount);
        usdt0.mint(player8, usdt0Amount);
        usdt0.mint(player2, 1000 * 10**6);
        usdt0.mint(player3, 1000 * 10**6);
        usdt0.mint(player4, 1000 * 10**6);
        usdt0.mint(player5, 1000 * 10**6);
        usdt0.mint(player6, 1000 * 10**6);
        usdt0.mint(player7, 1000 * 10**6);
        usdt0.mint(player8, 1000 * 10**6);

        mETH.mint(player1, 1000 * 10**18);
        mETH.mint(player2, 1000 * 10**18);
        mETH.mint(player3, 1000 * 10**18);
        mETH.mint(player4, 1000 * 10**18);
        mETH.mint(player5, 1000 * 10**18);
        mETH.mint(player6, 1000 * 10**18);
        mETH.mint(player7, 1000 * 10**18);
        mETH.mint(player8, 1000 * 10**18);
    }

    // Note: VRF removed - randomness is now block-based and processed immediately

    /**
     * @notice Helper to create a game and get players to minimum
     * @dev For USDT0, entryFee should be in USDT0's native units (6 decimals)
     *      For MNT/mETH, entryFee should be in wei (18 decimals)
     */
    function createGameWithMinPlayers(
        GameManager.Currency currency,
        uint256 entryFee,
        uint256 maxPlayers
    ) internal returns (uint256 gameId) {
        address[] memory players = new address[](MIN_PLAYERS);
        players[0] = player1;
        players[1] = player2;
        players[2] = player3;
        players[3] = player4;

        if (currency == GameManager.Currency.MNT) {
            vm.prank(player1);
            gameId = gameManager.createQuickPlayGame{value: entryFee}(entryFee, maxPlayers);
        } else if (currency == GameManager.Currency.USDT0) {
            vm.startPrank(player1);
            usdt0.approve(address(gameManager), entryFee);
            gameId = gameManager.createQuickPlayGameUSDT0(entryFee, maxPlayers);
            vm.stopPrank();
        } else if (currency == GameManager.Currency.METH) {
            vm.startPrank(player1);
            mETH.approve(address(gameManager), entryFee);
            gameId = gameManager.createQuickPlayGameMETH(entryFee, maxPlayers);
            vm.stopPrank();
        }

        // Join remaining players
        for (uint256 i = 1; i < MIN_PLAYERS; i++) {
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

        return gameId;
    }
}
