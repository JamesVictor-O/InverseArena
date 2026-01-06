// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {InverseToken} from "../contracts/InverseToken.sol";
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

        // 1. Deploy InverseToken
        console.log("\n1. Deploying InverseToken...");
        InverseToken inverseToken = new InverseToken();
        console.log("InverseToken deployed at:", address(inverseToken));

        // 2. Deploy YieldVault
        console.log("\n2. Deploying YieldVault...");
        YieldVault yieldVault = new YieldVault();
        console.log("YieldVault deployed at:", address(yieldVault));

        // 3. Deploy NFTAchievements
        console.log("\n3. Deploying NFTAchievements...");
        NFTAchievements nftAchievements = new NFTAchievements();
        console.log("NFTAchievements deployed at:", address(nftAchievements));

        // 4. Deploy GameManager
        // Note: Update these addresses based on your Chainlink VRF setup
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");
        uint64 vrfSubscriptionId = uint64(vm.envUint("VRF_SUBSCRIPTION_ID"));
        bytes32 vrfKeyHash = vm.envBytes32("VRF_KEY_HASH");

        console.log("\n4. Deploying GameManager...");
        GameManager gameManager = new GameManager(
            address(yieldVault),
            address(inverseToken),
            address(nftAchievements),
            vrfCoordinator,
            vrfSubscriptionId,
            vrfKeyHash
        );
        console.log("GameManager deployed at:", address(gameManager));

        // 5. Deploy Matchmaking
        console.log("\n5. Deploying Matchmaking...");
        Matchmaking matchmaking = new Matchmaking(address(gameManager));
        console.log("Matchmaking deployed at:", address(matchmaking));

        // 6. Set up authorizations
        console.log("\n6. Setting up authorizations...");
        
        // Authorize GameManager to mint achievements
        // Note: This would require adding a setAuthorizedMinter function to NFTAchievements
        // For now, owner can mint through GameManager
        
        // Authorize Matchmaking to create games
        // Note: Matchmaking needs to be able to call GameManager functions
        // This might require adding specific access controls

        console.log("\n=== Deployment Summary ===");
        console.log("InverseToken:", address(inverseToken));
        console.log("YieldVault:", address(yieldVault));
        console.log("NFTAchievements:", address(nftAchievements));
        console.log("GameManager:", address(gameManager));
        console.log("Matchmaking:", address(matchmaking));

        vm.stopBroadcast();
    }
}
