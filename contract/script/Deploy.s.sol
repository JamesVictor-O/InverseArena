// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {YieldVault} from "../contracts/YieldVault.sol";
import {NFTAchievements} from "../contracts/NFTAchievements.sol";
import {GameManager} from "../contracts/GameManager.sol";
import {Matchmaking} from "../contracts/Matchmaking.sol";

/**
 * @title DeployScript
 * @notice Deployment script for Inverse Arena contracts
 */
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying Inverse Arena contracts...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Using native token (MNT) for all transactions");

        // 1. Deploy YieldVault
        console.log("\n1. Deploying YieldVault...");
        YieldVault yieldVault = new YieldVault();
        console.log("YieldVault deployed at:", address(yieldVault));

        // 2. Deploy NFTAchievements
        console.log("\n2. Deploying NFTAchievements...");
        NFTAchievements nftAchievements = new NFTAchievements();
        console.log("NFTAchievements deployed at:", address(nftAchievements));

        // 3. Deploy GameManager
        // Note: Update these addresses based on your Chainlink VRF setup
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");
        uint64 vrfSubscriptionId = uint64(vm.envUint("VRF_SUBSCRIPTION_ID"));
        bytes32 vrfKeyHash = vm.envBytes32("VRF_KEY_HASH");

        console.log("\n3. Deploying GameManager...");
        GameManager gameManager = new GameManager(
            address(yieldVault),
            address(nftAchievements),
            vrfCoordinator,
            vrfSubscriptionId,
            vrfKeyHash
        );
        console.log("GameManager deployed at:", address(gameManager));

        // 4. Deploy Matchmaking
        console.log("\n4. Deploying Matchmaking...");
        Matchmaking matchmaking = new Matchmaking(address(gameManager));
        console.log("Matchmaking deployed at:", address(matchmaking));

        // 5. Set up authorizations
        console.log("\n5. Setting up authorizations...");
        
        // Authorize GameManager to mint achievements
        // Note: This would require adding a setAuthorizedMinter function to NFTAchievements
        // For now, owner can mint through GameManager
        
        // Authorize Matchmaking to create games
        // Note: Matchmaking needs to be able to call GameManager functions
        // This might require adding specific access controls

        console.log("\n=== Deployment Summary ===");
        console.log("YieldVault:", address(yieldVault));
        console.log("NFTAchievements:", address(nftAchievements));
        console.log("GameManager:", address(gameManager));
        console.log("Matchmaking:", address(matchmaking));
        console.log("\nNote: Using native Mantle token (MNT) for all game transactions");

        vm.stopBroadcast();
    }
}
