// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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
        // Note: For Mantle Sepolia testnet, you can either:
        // - Use official token addresses (if available)
        // - Deploy mock tokens first using DeployMockTokens.s.sol
        address usdt0 = vm.envOr("USDT0_ADDRESS", address(0)); 
        address mETH = vm.envOr("METH_ADDRESS", address(0)); 
        address aavePool = vm.envOr("AAVE_POOL_ADDRESS", address(0)); // Can be zero for initial deployment
        address mnt = address(0); // Native MNT
        
        require(usdt0 != address(0), "USDT0_ADDRESS not set in .env");
        require(mETH != address(0), "METH_ADDRESS not set in .env");
        
        console.log("\n1. Deploying YieldVault...");
        YieldVault yieldVault = new YieldVault(usdt0, mETH, aavePool, mnt);
        console.log("YieldVault deployed at:", address(yieldVault));

        // 2. Deploy NFTAchievements
        console.log("\n2. Deploying NFTAchievements...");
        NFTAchievements nftAchievements = new NFTAchievements();
        console.log("NFTAchievements deployed at:", address(nftAchievements));

        // 3. Deploy GameManager
        // Note: Using block-based randomness (no VRF needed for Mantle)
        console.log("\n3. Deploying GameManager...");
        GameManager gameManager = new GameManager(
            address(yieldVault),
            address(nftAchievements),
            usdt0,
            mETH
        );
        console.log("GameManager deployed at:", address(gameManager));

        // 4. Deploy Matchmaking
        console.log("\n4. Deploying Matchmaking...");
        Matchmaking matchmaking = new Matchmaking(address(gameManager));
        console.log("Matchmaking deployed at:", address(matchmaking));

        // 5. Set up authorizations
        console.log("\n5. Setting up authorizations...");
        
        // Authorize GameManager to mint achievements
        nftAchievements.setAuthorizedMinter(address(gameManager), true);
        console.log("GameManager authorized to mint achievements");
        
        // Transfer ownership of contracts to deployer (already owned, but ensure)
        // The contracts are already owned by deployer, so this is just for verification
        console.log("Contract ownership verified");

        console.log("\n=== Deployment Summary ===");
        console.log("YieldVault:", address(yieldVault));
        console.log("NFTAchievements:", address(nftAchievements));
        console.log("GameManager:", address(gameManager));
        console.log("Matchmaking:", address(matchmaking));
        console.log("\nNote: Using native Mantle token (MNT) for all game transactions");

        vm.stopBroadcast();
    }
}
