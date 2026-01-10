// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IYieldVault
 * @notice Interface for RWA yield generation vault supporting multiple currencies
 * @dev Supports USDT0, mETH, and native MNT with multiple yield protocols
 */
interface IYieldVault {
    /**
     * @notice Deposit USDT0 into yield vault
     * @param gameId Associated game ID
     * @param amount Amount of USDT0 to deposit
     * @return shares Shares received
     */
    function depositUSDT0(uint256 gameId, uint256 amount) external returns (uint256 shares);

    /**
     * @notice Deposit mETH for Ethereum staking yield
     * @param gameId Associated game ID
     * @param amount Amount of mETH to deposit
     * @return shares Shares received
     */
    function depositMETH(uint256 gameId, uint256 amount) external returns (uint256 shares);

    /**
     * @notice Deposit native MNT for yield generation
     * @param gameId Associated game ID
     * @param amount Amount of MNT to deposit
     * @return shares Shares received
     */
    function depositMNT(uint256 gameId, uint256 amount) external payable returns (uint256 shares);

    /**
     * @notice Deposit native MNT (legacy support - uses gameId 0)
     * @param amount Amount to deposit
     * @param protocol Protocol identifier (0 = mETH, 1 = USDT0, etc.)
     * @return shares Shares received
     */
    function depositToYield(uint256 amount, uint8 protocol) external payable returns (uint256 shares);

    /**
     * @notice Get accumulated yield for a game
     * @param gameId Game ID
     * @return yieldAmount Total yield accumulated
     */
    function getAccumulatedYield(uint256 gameId) external view returns (uint256 yieldAmount);

    /**
     * @notice Distribute yield to game winner
     * @param gameId Game ID
     * @param winner Winner address
     */
    function distributeYield(uint256 gameId, address winner) external;

    /**
     * @notice Withdraw principal + yield to calling contract (GameManager) for fee distribution
     * @param gameId Game ID to withdraw  
     * @return principal Original deposit amount
     * @return yieldAccumulated Yield earned on the deposit
     */
    function withdrawToContract(uint256 gameId) external returns (uint256 principal, uint256 yieldAccumulated);

    /**
     * @notice Emit yield snapshot for a game (for tracking/analytics)
     * @param gameId Game ID
     */
    function emitYieldSnapshot(uint256 gameId) external;

    /**
     * @notice Get total value locked in yield protocols
     * @return totalValue Total value in native token
     */
    function getTotalValueLocked() external view returns (uint256 totalValue);
}
