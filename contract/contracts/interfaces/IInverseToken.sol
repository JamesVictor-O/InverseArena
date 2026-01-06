// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IInverseToken {
    /**
     * @notice Stake tokens to earn rewards
     * @param amount Amount to stake
     */
    function stake(uint256 amount) external;

    /**
     * @notice Unstake tokens
     * @param amount Amount to unstake
     */
    function unstake(uint256 amount) external;

    /**
     * @notice Get staking rewards for a user
     * @param user User address
     * @return rewards Amount of rewards earned
     */
    function getStakingRewards(address user) external view returns (uint256 rewards);

    /**
     * @notice Get discount percentage for entry fees based on staked amount
     * @param user User address
     * @return discount Discount percentage (0-30, representing 0-30%)
     */
    function getEntryFeeDiscount(address user) external view returns (uint256 discount);

    /**
     * @notice Check if user has VIP access
     * @param user User address
     * @return hasAccess True if user has VIP access
     */
    function hasVIPAccess(address user) external view returns (bool hasAccess);
}
