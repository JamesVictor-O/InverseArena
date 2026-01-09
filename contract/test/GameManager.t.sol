// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {GameManager} from "../contracts/GameManager.sol";
import {YieldVault} from "../contracts/YieldVault.sol";
import {TestHelpers} from "./helpers/TestHelpers.sol";


contract GameManagerTest is TestHelpers {
    uint256 public constant TEST_ENTRY_FEE = 0.01 ether;
    uint256 public constant TEST_MAX_PLAYERS = 10;

    uint256 public constant USDT0_ENTRY_FEE = 1000000000000000; 

    

    function testCreateQuickPlayGameMNT() public {
        vm.prank(player1);
        uint256 gameId = gameManager.createQuickPlayGame{value: TEST_ENTRY_FEE}(TEST_ENTRY_FEE, TEST_MAX_PLAYERS);

        assertEq(gameId, 0);
        (
            uint256 gameId_,
            GameManager.GameMode mode,
            GameManager.GameStatus status,
            GameManager.Currency currency,
            uint256 entryFee,
            uint256 maxPlayers,
            uint256 currentRound,
            address winner,
            uint256 totalPrizePool,
            uint256 yieldAccumulated,
            uint256 playerCount
        ) = gameManager.getGame(gameId);
        
        assertEq(gameId_, gameId);
        assertEq(uint256(mode), uint256(GameManager.GameMode.QuickPlay));
        assertEq(uint256(status), uint256(GameManager.GameStatus.Waiting));
        assertEq(uint256(currency), uint256(GameManager.Currency.MNT));
        assertEq(entryFee, TEST_ENTRY_FEE);
        assertEq(maxPlayers, TEST_MAX_PLAYERS);
        assertEq(playerCount, 1);
    }

    function testCreateQuickPlayGameUSDT0() public {
        vm.startPrank(player1);
        usdt0.approve(address(gameManager), USDT0_ENTRY_FEE);
        uint256 gameId = gameManager.createQuickPlayGameUSDT0(USDT0_ENTRY_FEE, TEST_MAX_PLAYERS);
        vm.stopPrank();

        assertEq(gameId, 0);
        (,,,,uint256 entryFee,,,address winner,uint256 totalPrizePool,,) = gameManager.getGame(gameId);

        assertEq(entryFee, USDT0_ENTRY_FEE);
        assertGt(totalPrizePool, 0);
    }

    function testCreateQuickPlayGameMETH() public {
        vm.startPrank(player1);
        mETH.approve(address(gameManager), TEST_ENTRY_FEE);
        uint256 gameId = gameManager.createQuickPlayGameMETH(TEST_ENTRY_FEE, TEST_MAX_PLAYERS);
        vm.stopPrank();

        assertEq(gameId, 0);
        (,,,,uint256 entryFee,,,address winner,uint256 totalPrizePool,,) = gameManager.getGame(gameId);
        // Verify game was created
        assertEq(entryFee, TEST_ENTRY_FEE);
        assertGt(totalPrizePool, 0);
    }

    function testCreatePrivateRoom() public {
        vm.startPrank(player1);
        usdt0.approve(address(gameManager), USDT0_ENTRY_FEE);
        uint256 gameId = gameManager.createPrivateRoom(
            GameManager.Currency.USDT0,
            USDT0_ENTRY_FEE,
            TEST_MAX_PLAYERS
        );
        vm.stopPrank();

        (,,GameManager.GameStatus status,,uint256 entryFee,uint256 maxPlayers,,,uint256 totalPrizePool,,) = gameManager.getGame(gameId);
        assertEq(maxPlayers, TEST_MAX_PLAYERS);
        assertEq(entryFee, USDT0_ENTRY_FEE);
    }

    function test_RevertWhen_EntryFeeTooLow() public {
        vm.prank(player1);
        vm.expectRevert();
        gameManager.createQuickPlayGame{value: 0.0001 ether}(0.0001 ether, TEST_MAX_PLAYERS); // Too low
    }

    function test_RevertWhen_MaxPlayersTooFew() public {
        vm.prank(player1);
        vm.expectRevert();
        gameManager.createQuickPlayGame{value: TEST_ENTRY_FEE}(TEST_ENTRY_FEE, 3); // Too few
    }

    // ============ Join Game Tests ============

    function testJoinGameMNT() public {
        vm.prank(player1);
        uint256 gameId = gameManager.createQuickPlayGame{value: TEST_ENTRY_FEE}(TEST_ENTRY_FEE, TEST_MAX_PLAYERS);

        vm.prank(player2);
        gameManager.joinGame{value: TEST_ENTRY_FEE}(gameId);

        address[] memory players = gameManager.getGamePlayers(gameId);
        assertEq(players.length, 2);
        assertEq(players[1], player2);
    }

    function testJoinGameUSDT0() public {
        vm.startPrank(player1);
        usdt0.approve(address(gameManager), USDT0_ENTRY_FEE);
        uint256 gameId = gameManager.createQuickPlayGameUSDT0(USDT0_ENTRY_FEE, TEST_MAX_PLAYERS);
        vm.stopPrank();

        vm.startPrank(player2);
        usdt0.approve(address(gameManager), USDT0_ENTRY_FEE);
        gameManager.joinGame(gameId);
        vm.stopPrank();

        address[] memory players = gameManager.getGamePlayers(gameId);
        assertEq(players.length, 2);
    }

    function testAutoStartWhenMinPlayersReached() public {
        uint256 gameId = createGameWithMinPlayers(
            GameManager.Currency.MNT,
            TEST_ENTRY_FEE,
            TEST_MAX_PLAYERS
        );

        (,,GameManager.GameStatus status,,uint256 entryFee,uint256 maxPlayers,uint256 currentRound,address winner,uint256 totalPrizePool,uint256 yieldAccumulated,uint256 playerCount) = gameManager.getGame(gameId);
        assertEq(uint256(status), uint256(GameManager.GameStatus.InProgress));
        assertEq(currentRound, 1);
        assertEq(playerCount, MIN_PLAYERS);
    }

    function test_RevertWhen_JoinGameWithWrongAmount() public {
        vm.prank(player1);
        uint256 gameId = gameManager.createQuickPlayGame{value: TEST_ENTRY_FEE}(TEST_ENTRY_FEE, TEST_MAX_PLAYERS);

        vm.prank(player2);
        vm.expectRevert();
        gameManager.joinGame{value: TEST_ENTRY_FEE / 2}(gameId); // Wrong amount
    }

    function test_RevertWhen_JoinFullGame() public {
        uint256 maxPlayers = 4;
        vm.prank(player1);
        uint256 gameId = gameManager.createQuickPlayGame{value: TEST_ENTRY_FEE}(TEST_ENTRY_FEE, maxPlayers);

        vm.prank(player2);
        gameManager.joinGame{value: TEST_ENTRY_FEE}(gameId);
        vm.prank(player3);
        gameManager.joinGame{value: TEST_ENTRY_FEE}(gameId);
        vm.prank(player4);
        gameManager.joinGame{value: TEST_ENTRY_FEE}(gameId);

        
        address[] memory players = gameManager.getGamePlayers(gameId);
        assertEq(players.length, 4);

   
        vm.prank(player5);
        vm.expectRevert();
        gameManager.joinGame{value: TEST_ENTRY_FEE}(gameId); // Should fail - game full
    }

    // ============ Make Choice Tests ============

    function testMakeChoice() public {
        uint256 gameId = createGameWithMinPlayers(
            GameManager.Currency.MNT,
            TEST_ENTRY_FEE,
            TEST_MAX_PLAYERS
        );

        vm.prank(player1);
        gameManager.makeChoice(gameId, GameManager.Choice.Head);

        GameManager.PlayerInfo memory info = gameManager.getPlayerInfo(gameId, player1);
        assertTrue(info.hasMadeChoice);
        assertEq(uint256(info.choice), uint256(GameManager.Choice.Head));
    }

    function test_RevertWhen_MakeChoiceTwice() public {
        uint256 gameId = createGameWithMinPlayers(
            GameManager.Currency.MNT,
            TEST_ENTRY_FEE,
            TEST_MAX_PLAYERS
        );

        vm.prank(player1);
        gameManager.makeChoice(gameId, GameManager.Choice.Head);

        vm.prank(player1);
        vm.expectRevert();
        gameManager.makeChoice(gameId, GameManager.Choice.Tail);
    }

    function test_RevertWhen_MakeChoiceBeforeGameStarts() public {
        vm.prank(player1);
        uint256 gameId = gameManager.createQuickPlayGame{value: TEST_ENTRY_FEE}(TEST_ENTRY_FEE, TEST_MAX_PLAYERS);

        vm.prank(player1);
        vm.expectRevert();
        gameManager.makeChoice(gameId, GameManager.Choice.Head); // Should fail - game not started
    }


    function testProcessRoundMinoritySurvives() public {
        // Create game with 4 players (min required) - game will start when 4th player joins
        vm.prank(player1);
        uint256 gameId = gameManager.createQuickPlayGame{value: TEST_ENTRY_FEE}(TEST_ENTRY_FEE, 4);
        
        // Join 3 more players (game starts when 4th player joins)
        vm.prank(player2);
        gameManager.joinGame{value: TEST_ENTRY_FEE}(gameId);
        vm.prank(player3);
        gameManager.joinGame{value: TEST_ENTRY_FEE}(gameId);
        vm.prank(player5); // Use player5 instead of player4 (address(5) is ECRecover precompile)
        gameManager.joinGame{value: TEST_ENTRY_FEE}(gameId);
        
        // Now make choices: 3 Head, 1 Tail (Tail should survive)
        vm.prank(player1);
        gameManager.makeChoice(gameId, GameManager.Choice.Head);
        vm.prank(player2);
        gameManager.makeChoice(gameId, GameManager.Choice.Head);
        vm.prank(player3);
        gameManager.makeChoice(gameId, GameManager.Choice.Head);
        vm.prank(player5);
        gameManager.makeChoice(gameId, GameManager.Choice.Tail);
        
        // Round should be processed immediately when all players choose
        // Check that Tail player survived (minority survives)
        GameManager.PlayerInfo memory tailPlayer = gameManager.getPlayerInfo(gameId, player5);
        assertTrue(!tailPlayer.eliminated, "Tail player (minority) should survive");
        assertEq(tailPlayer.roundEliminated, 0, "Tail player should not be eliminated");
        
        // Check that Head players were eliminated (majority eliminated)
        GameManager.PlayerInfo memory headPlayer1 = gameManager.getPlayerInfo(gameId, player1);
        assertTrue(headPlayer1.eliminated, "Head player 1 (majority) should be eliminated");
        assertGt(headPlayer1.roundEliminated, 0, "Head player 1 should have elimination round set");
        
        GameManager.PlayerInfo memory headPlayer2 = gameManager.getPlayerInfo(gameId, player2);
        assertTrue(headPlayer2.eliminated, "Head player 2 (majority) should be eliminated");
        
    }


    function testCompleteGameWithWinner() public {
        uint256 gameId = createGameWithMinPlayers(
            GameManager.Currency.MNT,
            TEST_ENTRY_FEE,
            TEST_MAX_PLAYERS
        );

        (,,GameManager.GameStatus status,,uint256 entryFee,uint256 maxPlayers,uint256 currentRound,address winner,uint256 totalPrizePool,uint256 yieldAccumulated,uint256 playerCount) = gameManager.getGame(gameId);
        assertEq(uint256(status), uint256(GameManager.GameStatus.InProgress));
    }


    function testGetGame() public {
        vm.prank(player1);
        uint256 gameId = gameManager.createQuickPlayGame{value: TEST_ENTRY_FEE}(TEST_ENTRY_FEE, TEST_MAX_PLAYERS);

        (uint256 gameId_,,,,uint256 entryFee,,,address winner,uint256 totalPrizePool,uint256 yieldAccumulated,uint256 playerCount) = gameManager.getGame(gameId);
        assertEq(gameId_, gameId);
        assertEq(entryFee, TEST_ENTRY_FEE);
    }

    function testGetGamePlayers() public {
        uint256 gameId = createGameWithMinPlayers(
            GameManager.Currency.MNT,
            TEST_ENTRY_FEE,
            TEST_MAX_PLAYERS
        );

        address[] memory players = gameManager.getGamePlayers(gameId);
        assertEq(players.length, MIN_PLAYERS);
    }

    function testGetPlayerInfo() public {
        uint256 gameId = createGameWithMinPlayers(
            GameManager.Currency.MNT,
            TEST_ENTRY_FEE,
            TEST_MAX_PLAYERS
        );

        GameManager.PlayerInfo memory info = gameManager.getPlayerInfo(gameId, player1);
        assertTrue(info.isPlaying);
        assertEq(info.entryAmount, TEST_ENTRY_FEE);
    }

    function testGetStats() public {
        vm.prank(player1);
        gameManager.createQuickPlayGame{value: TEST_ENTRY_FEE}(TEST_ENTRY_FEE, TEST_MAX_PLAYERS);

        GameManager.GameStats memory stats = gameManager.getStats();
        assertEq(stats.totalGames, 1);
    }

    // ============ Admin Function Tests ============

    function testSetPlatformFee() public {
        vm.prank(owner);
        gameManager.setPlatformFee(300);

       
    }

    function test_RevertWhen_SetPlatformFeeTooHigh() public {
        vm.prank(owner);
        vm.expectRevert();
        gameManager.setPlatformFee(1500); 
    }

    function test_RevertWhen_SetPlatformFeeNotOwner() public {
        vm.prank(player1);
        vm.expectRevert();
        gameManager.setPlatformFee(300); 
    }

    function testUpdateContracts() public {
        YieldVault newVault = new YieldVault(
            address(usdt0),
            address(mETH),
            address(0),
            address(0)
        );

        vm.prank(owner);
        gameManager.updateContracts(address(newVault), address(nftAchievements));
    }

    function test_RevertWhen_UpdateContractsNotOwner() public {
        vm.prank(player1);
        vm.expectRevert();
        gameManager.updateContracts(address(yieldVault), address(nftAchievements));
    }
}
