// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface INFTAchievements {
    /**
     * @notice Mint an achievement NFT
     * @param to Recipient address
     * @param achievementType Type of achievement (0 = First Win, 1 = 10-game Streak, etc.)
     * @param gameId Associated game ID (if applicable)
     */
    function mintAchievement(address to, uint8 achievementType, uint256 gameId) external;

    /**
     * @notice Check if user has a specific achievement
     * @param user User address
     * @param achievementType Achievement type
     * @return hasAchievement True if user has the achievement
     */
    function hasAchievement(address user, uint8 achievementType) external view returns (bool hasAchievement);

    /**
     * @notice Get all achievements for a user
     * @param user User address
     * @return tokenIds Array of achievement token IDs
     */
    function getUserAchievements(address user) external view returns (uint256[] memory tokenIds);
}
