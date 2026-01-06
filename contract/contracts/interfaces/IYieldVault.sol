// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IYieldVault {
    /**
     * @notice Deposit funds into yield-generating protocol
     * @param amount Amount to deposit
     * @param protocol Protocol identifier (0 = mETH, 1 = USDT0, etc.)
     * @return shares Amount of shares received
     */
    function depositToYield(uint256 amount, uint8 protocol) external returns (uint256 shares);

    /**
     * @notice Withdraw funds from yield protocol
     * @param shares Amount of shares to withdraw
     * @return amount Amount of tokens received
     */
    function withdrawFromYield(uint256 shares) external returns (uint256 amount);

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
     * @notice Get total value locked in yield protocols
     * @return totalValue Total value in native token
     */
    function getTotalValueLocked() external view returns (uint256 totalValue);
}
