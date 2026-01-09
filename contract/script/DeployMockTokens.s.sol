// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/**
 * @title DeployMockTokens
 * @notice Deploy mock USDT0 and mETH tokens for testing on Mantle Sepolia
 * @dev Use this if official testnet tokens don't exist or you need tokens for testing
 */
contract DeployMockTokens is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying Mock Tokens for Mantle Sepolia Testnet...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        // Deploy Mock USDT0 (6 decimals)
        console.log("\n1. Deploying Mock USDT0 (6 decimals)...");
        MockERC20 mockUSDT0 = new MockERC20(
            "Mock USDT0",
            "USDT0",
            6
        );
        console.log("Mock USDT0 deployed at:", address(mockUSDT0));
        console.log("Initial supply: 1,000,000 USDT0");
        console.log("Decimals: 6");

        // Deploy Mock mETH (18 decimals)
        console.log("\n2. Deploying Mock mETH (18 decimals)...");
        MockERC20 mockMETH = new MockERC20(
            "Mock Mantle Staked ETH",
            "mETH",
            18
        );
        console.log("Mock mETH deployed at:", address(mockMETH));
        console.log("Initial supply: 1,000,000 mETH");
        console.log("Decimals: 18");

        console.log("\n=== Deployment Summary ===");
        console.log("Mock USDT0 Address:", address(mockUSDT0));
        console.log("Mock mETH Address:", address(mockMETH));
        console.log("\n=== Next Steps ===");
        console.log("1. Update your .env file:");
        console.log("   USDT0_ADDRESS=", address(mockUSDT0));
        console.log("   METH_ADDRESS=", address(mockMETH));
        console.log("\n2. Use these addresses in your main contract deployment");
        console.log("\n3. Mint tokens to test accounts using the mint() function:");

        vm.stopBroadcast();
    }
}
