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
 * @dev Deploys contracts in the correct order and sets up authorizations
 */
contract DeployScript is Script {
    // Deployment addresses (will be populated during deployment)
    address public yieldVaultAddress;
    address public nftAchievementsAddress;
    address public gameManagerAddress;
    address public matchmakingAddress;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("========================================");
        console.log("Inverse Arena Contract Deployment");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Network: Mantle");
        console.log("========================================\n");

        // Load configuration from environment
        address usdt0 = vm.envOr("USDT0_ADDRESS", address(0)); 
        address mETH = vm.envOr("METH_ADDRESS", address(0)); 
        address aavePool = vm.envOr("AAVE_POOL_ADDRESS", address(0)); // Optional
        address mnt = address(0); // Native MNT
        
        // Validate required addresses
        require(usdt0 != address(0), "USDT0_ADDRESS not set in .env");
        require(mETH != address(0), "METH_ADDRESS not set in .env");
        
        console.log("Configuration:");
        console.log("  USDT0:", usdt0);
        console.log("  mETH:", mETH);
        console.log("  Aave Pool:", aavePool != address(0) ? vm.toString(aavePool) : "Not configured");
        console.log("  Native MNT: Native token\n");

        // 1. Deploy YieldVault
        console.log("Step 1/4: Deploying YieldVault...");
        YieldVault yieldVault = new YieldVault(usdt0, mETH, aavePool, mnt);
        yieldVaultAddress = address(yieldVault);
        console.log("  [OK] YieldVault deployed at:", yieldVaultAddress);

        // 2. Deploy NFTAchievements
        console.log("\nStep 2/4: Deploying NFTAchievements...");
        NFTAchievements nftAchievements = new NFTAchievements();
        nftAchievementsAddress = address(nftAchievements);
        console.log("  [OK] NFTAchievements deployed at:", nftAchievementsAddress);

        // 3. Deploy GameManager
        console.log("\nStep 3/4: Deploying GameManager...");
        console.log("  Note: Using block-based randomness (no VRF needed)");
        GameManager gameManager = new GameManager(
            yieldVaultAddress,
            nftAchievementsAddress,
            usdt0,
            mETH
        );
        gameManagerAddress = address(gameManager);
        console.log("  [OK] GameManager deployed at:", gameManagerAddress);

        // 4. Deploy Matchmaking
        console.log("\nStep 4/4: Deploying Matchmaking...");
        Matchmaking matchmaking = new Matchmaking(gameManagerAddress);
        matchmakingAddress = address(matchmaking);
        console.log("  [OK] Matchmaking deployed at:", matchmakingAddress);

        // 5. Set up authorizations and configurations
        console.log("\nSetting up authorizations and configurations...");
        
        // Set GameManager address in YieldVault (required for withdrawToContract)
        yieldVault.setGameManager(gameManagerAddress);
        console.log("  [OK] GameManager address set in YieldVault");
        
        // Authorize GameManager to mint achievements
        nftAchievements.setAuthorizedMinter(gameManagerAddress, true);
        console.log("  [OK] GameManager authorized to mint achievements");
        
        // Verify authorization
        // Note: We can't easily check this in the script, but it will revert if it fails
        
        // Verify contract ownership
        require(yieldVault.owner() == deployer, "YieldVault ownership mismatch");
        require(nftAchievements.owner() == deployer, "NFTAchievements ownership mismatch");
        require(gameManager.owner() == deployer, "GameManager ownership mismatch");
        require(matchmaking.owner() == deployer, "Matchmaking ownership mismatch");
        console.log("  [OK] All contracts owned by deployer");
        
        // Verify GameManager is set in YieldVault
        require(yieldVault.gameManager() == gameManagerAddress, "GameManager address not set correctly in YieldVault");
        console.log("  [OK] GameManager address verified in YieldVault");

        // Print deployment summary
        console.log("\n========================================");
        console.log("Deployment Summary");
        console.log("========================================");
        console.log("YieldVault:        ", yieldVaultAddress);
        console.log("NFTAchievements:   ", nftAchievementsAddress);
        console.log("GameManager:       ", gameManagerAddress);
        console.log("Matchmaking:        ", matchmakingAddress);
        console.log("========================================");
        console.log("\nNext Steps:");
        console.log("1. Verify contracts on block explorer");
        console.log("2. Update frontend .env with contract addresses");
        console.log("3. Test contract interactions");
        console.log("4. Configure yield protocols if needed\n");

        vm.stopBroadcast();
    }
}
