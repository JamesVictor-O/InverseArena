// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NFTAchievements} from "../contracts/NFTAchievements.sol";
import {TestHelpers} from "./helpers/TestHelpers.sol";

contract NFTAchievementsTest is TestHelpers {
    uint256 public constant TEST_GAME_ID = 1;

    function setUp() public override {
        super.setUp();
        // nftAchievements is already deployed in TestHelpers
    }

    // ============ Constructor Tests ============

    function testConstructor() public view {
        assertEq(nftAchievements.name(), "Inverse Arena Achievements");
        assertEq(nftAchievements.symbol(), "INVACH");
        assertEq(nftAchievements.owner(), owner);
    }

    // ============ Minting Tests ============

    function testMintAchievementFirstWin() public {
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID); // FirstWin
        vm.stopPrank();

        assertEq(nftAchievements.balanceOf(player1), 1);
        assertEq(nftAchievements.userAchievementCount(player1), 1);
        assertTrue(nftAchievements.hasAchievement(player1, 0));
    }

    function testMintAchievementMultipleTypes() public {
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID); // FirstWin
        nftAchievements.mintAchievement(player1, 1, TEST_GAME_ID + 1); // TenGameStreak
        nftAchievements.mintAchievement(player1, 2, TEST_GAME_ID + 2); // TournamentChampion
        vm.stopPrank();

        assertEq(nftAchievements.balanceOf(player1), 3);
        assertEq(nftAchievements.userAchievementCount(player1), 3);
        assertTrue(nftAchievements.hasAchievement(player1, 0));
        assertTrue(nftAchievements.hasAchievement(player1, 1));
        assertTrue(nftAchievements.hasAchievement(player1, 2));
    }

    function testMintAchievementToDifferentUsers() public {
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID);
        nftAchievements.mintAchievement(player2, 0, TEST_GAME_ID + 1);
        vm.stopPrank();

        assertEq(nftAchievements.balanceOf(player1), 1);
        assertEq(nftAchievements.balanceOf(player2), 1);
        assertTrue(nftAchievements.hasAchievement(player1, 0));
        assertTrue(nftAchievements.hasAchievement(player2, 0));
    }

    function testMintAchievementTournamentChampionMultiple() public {
        // TournamentChampion can be minted multiple times
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 2, TEST_GAME_ID); // TournamentChampion
        nftAchievements.mintAchievement(player1, 2, TEST_GAME_ID + 1); // TournamentChampion again
        vm.stopPrank();

        assertEq(nftAchievements.balanceOf(player1), 2);
        assertEq(nftAchievements.userAchievementCount(player1), 2);
    }

    function testMintAchievementYieldEarnerMultiple() public {
        // YieldEarner can be minted multiple times
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 8, TEST_GAME_ID); // YieldEarner
        nftAchievements.mintAchievement(player1, 8, TEST_GAME_ID + 1); // YieldEarner again
        vm.stopPrank();

        assertEq(nftAchievements.balanceOf(player1), 2);
    }

    function test_RevertWhen_MintAchievementNotAuthorized() public {
        vm.prank(player1);
        vm.expectRevert("Not authorized to mint");
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID);
    }

    function test_RevertWhen_MintAchievementZeroAddress() public {
        vm.startPrank(owner);
        vm.expectRevert("Cannot mint to zero address");
        nftAchievements.mintAchievement(address(0), 0, TEST_GAME_ID);
        vm.stopPrank();
    }

    function test_RevertWhen_MintAchievementInvalidType() public {
        vm.startPrank(owner);
        vm.expectRevert("Invalid achievement type");
        nftAchievements.mintAchievement(player1, 10, TEST_GAME_ID); // Invalid type
        vm.stopPrank();
    }

    function test_RevertWhen_MintAchievementAlreadyEarned() public {
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID); // FirstWin
        
        // Try to mint same achievement again - should fail
        vm.expectRevert("Achievement already earned");
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID + 1);
        vm.stopPrank();
    }

    // ============ Achievement Query Tests ============

    function testHasAchievement() public {
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID);
        vm.stopPrank();

        assertTrue(nftAchievements.hasAchievement(player1, 0));
        assertFalse(nftAchievements.hasAchievement(player1, 1));
        assertFalse(nftAchievements.hasAchievement(player2, 0));
    }

    function testGetUserAchievements() public {
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID);
        nftAchievements.mintAchievement(player1, 1, TEST_GAME_ID + 1);
        nftAchievements.mintAchievement(player1, 2, TEST_GAME_ID + 2);
        vm.stopPrank();

        uint256[] memory achievements = nftAchievements.getUserAchievements(player1);
        assertEq(achievements.length, 3);
        assertEq(achievements[0], 0);
        assertEq(achievements[1], 1);
        assertEq(achievements[2], 2);
    }

    function testGetUserAchievementsEmpty() public {
        uint256[] memory achievements = nftAchievements.getUserAchievements(player1);
        assertEq(achievements.length, 0);
    }

    function testGetAchievement() public {
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID);
        vm.stopPrank();

        (
            NFTAchievements.AchievementType achievementType,
            uint256 gameId,
            uint256 timestamp,
            string memory metadataURI
        ) = nftAchievements.getAchievement(0);

        assertEq(uint256(uint8(achievementType)), 0); // FirstWin
        assertEq(gameId, TEST_GAME_ID);
        assertGt(timestamp, 0);
        assertGt(bytes(metadataURI).length, 0);
    }

    function test_RevertWhen_GetAchievementNonExistent() public {
        vm.expectRevert("Token does not exist");
        nftAchievements.getAchievement(999);
    }

    function testGetAchievementName() public view {
        string memory name = nftAchievements.getAchievementName(NFTAchievements.AchievementType.FirstWin);
        assertEq(name, "First Victory");
        
        name = nftAchievements.getAchievementName(NFTAchievements.AchievementType.TenGameStreak);
        assertEq(name, "Ten Game Streak");
    }

    function testGetAchievementDescription() public view {
        string memory desc = nftAchievements.getAchievementDescription(NFTAchievements.AchievementType.FirstWin);
        assertEq(desc, "Won your first game in Inverse Arena");
        
        desc = nftAchievements.getAchievementDescription(NFTAchievements.AchievementType.YieldEarner);
        assertEq(desc, "Earned 100 tokens from yield");
    }

    // ============ Token URI Tests ============

    function testTokenURI() public {
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID);
        vm.stopPrank();

        string memory uri = nftAchievements.tokenURI(0);
        assertGt(bytes(uri).length, 0);
        // Should contain baseURI
        assertTrue(bytes(uri).length > 0);
    }

    // ============ Admin Functions Tests ============

    function testSetBaseURI() public {
        string memory newBaseURI = "https://new-api.inversearena.xyz/achievements/";
        
        vm.startPrank(owner);
        nftAchievements.setBaseURI(newBaseURI);
        vm.stopPrank();

        assertEq(nftAchievements.baseURI(), newBaseURI);
    }

    function test_RevertWhen_SetBaseURINotOwner() public {
        vm.prank(player1);
        vm.expectRevert();
        nftAchievements.setBaseURI("https://new-api.inversearena.xyz/achievements/");
    }

    function testUpdateAchievementMetadata() public {
        vm.startPrank(owner);
        nftAchievements.updateAchievementMetadata(
            NFTAchievements.AchievementType.FirstWin,
            "Updated First Victory",
            "Updated description"
        );
        vm.stopPrank();

        string memory name = nftAchievements.getAchievementName(NFTAchievements.AchievementType.FirstWin);
        string memory desc = nftAchievements.getAchievementDescription(NFTAchievements.AchievementType.FirstWin);
        
        assertEq(name, "Updated First Victory");
        assertEq(desc, "Updated description");
    }

    function test_RevertWhen_UpdateAchievementMetadataNotOwner() public {
        vm.prank(player1);
        vm.expectRevert();
        nftAchievements.updateAchievementMetadata(
            NFTAchievements.AchievementType.FirstWin,
            "Updated",
            "Updated"
        );
    }

    function testSetAuthorizedMinter() public {
        // This function exists but doesn't do anything in current implementation
        // It's a placeholder for future functionality
        vm.startPrank(owner);
        nftAchievements.setAuthorizedMinter(address(gameManager), true);
        vm.stopPrank();
        
        // Should not revert, but also doesn't change behavior yet
        // In production, this would update a mapping
    }

    // ============ ERC721 Tests ============

    function testOwnerOf() public {
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID);
        vm.stopPrank();

        assertEq(nftAchievements.ownerOf(0), player1);
    }

    function testBalanceOf() public {
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID);
        nftAchievements.mintAchievement(player1, 1, TEST_GAME_ID + 1);
        vm.stopPrank();

        assertEq(nftAchievements.balanceOf(player1), 2);
        assertEq(nftAchievements.balanceOf(player2), 0);
    }

    function testTransfer() public {
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID);
        vm.stopPrank();

        vm.startPrank(player1);
        nftAchievements.transferFrom(player1, player2, 0);
        vm.stopPrank();

        assertEq(nftAchievements.ownerOf(0), player2);
        assertEq(nftAchievements.balanceOf(player1), 0);
        assertEq(nftAchievements.balanceOf(player2), 1);
    }

    // ============ Edge Cases ============

    function testMintAllAchievementTypes() public {
        vm.startPrank(owner);
        for (uint8 i = 0; i <= 9; i++) {
            nftAchievements.mintAchievement(player1, i, TEST_GAME_ID + i);
        }
        vm.stopPrank();

        assertEq(nftAchievements.balanceOf(player1), 10);
        assertEq(nftAchievements.userAchievementCount(player1), 10);
        
        for (uint8 i = 0; i <= 9; i++) {
            assertTrue(nftAchievements.hasAchievement(player1, i));
        }
    }

    function testAchievementMetadataInitialization() public view {
        // Check all achievement names are initialized
        assertGt(bytes(nftAchievements.getAchievementName(NFTAchievements.AchievementType.FirstWin)).length, 0);
        assertGt(bytes(nftAchievements.getAchievementName(NFTAchievements.AchievementType.TenGameStreak)).length, 0);
        assertGt(bytes(nftAchievements.getAchievementName(NFTAchievements.AchievementType.TournamentChampion)).length, 0);
        assertGt(bytes(nftAchievements.getAchievementName(NFTAchievements.AchievementType.LoyaltyBronze)).length, 0);
        assertGt(bytes(nftAchievements.getAchievementName(NFTAchievements.AchievementType.LoyaltySilver)).length, 0);
        assertGt(bytes(nftAchievements.getAchievementName(NFTAchievements.AchievementType.LoyaltyGold)).length, 0);
        assertGt(bytes(nftAchievements.getAchievementName(NFTAchievements.AchievementType.LoyaltyPlatinum)).length, 0);
        assertGt(bytes(nftAchievements.getAchievementName(NFTAchievements.AchievementType.ReferralMaster)).length, 0);
        assertGt(bytes(nftAchievements.getAchievementName(NFTAchievements.AchievementType.YieldEarner)).length, 0);
        assertGt(bytes(nftAchievements.getAchievementName(NFTAchievements.AchievementType.ContrarianMaster)).length, 0);
    }

    function testUserAchievementCount() public {
        assertEq(nftAchievements.userAchievementCount(player1), 0);
        
        vm.startPrank(owner);
        nftAchievements.mintAchievement(player1, 0, TEST_GAME_ID);
        assertEq(nftAchievements.userAchievementCount(player1), 1);
        
        nftAchievements.mintAchievement(player1, 1, TEST_GAME_ID + 1);
        assertEq(nftAchievements.userAchievementCount(player1), 2);
        vm.stopPrank();
    }

    function test_RevertWhen_HasAchievementInvalidType() public {
        vm.expectRevert("Invalid achievement type");
        nftAchievements.hasAchievement(player1, 10);
    }
}
