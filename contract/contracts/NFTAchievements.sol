// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/INFTAchievements.sol";

/**
 * @title NFTAchievements
 * @notice NFT collection for player achievements in Inverse Arena
 * @dev Mints achievement badges for milestones like first win, streaks, etc.
 */
contract NFTAchievements is ERC721URIStorage, Ownable, INFTAchievements {
    using Counters for Counters.Counter;

    // ============ Enums ============

    enum AchievementType {
        FirstWin,           // 0
        TenGameStreak,      // 1
        TournamentChampion, // 2
        LoyaltyBronze,      // 3
        LoyaltySilver,      // 4
        LoyaltyGold,        // 5
        LoyaltyPlatinum,    // 6
        ReferralMaster,     // 7
        YieldEarner,        // 8
        ContrarianMaster    // 9
    }

    // ============ Structs ============

    struct Achievement {
        uint256 tokenId;
        AchievementType achievementType;
        uint256 gameId;
        uint256 timestamp;
        string metadataURI;
    }

    // ============ State Variables ============

    Counters.Counter private _tokenIdCounter;

    mapping(uint256 => Achievement) public achievements;
    mapping(address => uint256[]) public userAchievements;
    mapping(address => mapping(AchievementType => bool)) public hasAchievement;
    mapping(address => uint256) public userAchievementCount;

    string public baseURI = "https://api.inversearena.xyz/achievements/";

    // Achievement metadata
    mapping(AchievementType => string) public achievementNames;
    mapping(AchievementType => string) public achievementDescriptions;

    // ============ Events ============

    event AchievementMinted(
        address indexed to,
        uint256 indexed tokenId,
        AchievementType achievementType,
        uint256 gameId
    );

    event BaseURIUpdated(string newBaseURI);

    // ============ Constructor ============

    constructor() ERC721("Inverse Arena Achievements", "INVACH") Ownable(msg.sender) {
        _initializeAchievementMetadata();
    }

    /**
     * @notice Initialize achievement metadata
     */
    function _initializeAchievementMetadata() internal {
        achievementNames[AchievementType.FirstWin] = "First Victory";
        achievementNames[AchievementType.TenGameStreak] = "Ten Game Streak";
        achievementNames[AchievementType.TournamentChampion] = "Tournament Champion";
        achievementNames[AchievementType.LoyaltyBronze] = "Bronze Loyalty";
        achievementNames[AchievementType.LoyaltySilver] = "Silver Loyalty";
        achievementNames[AchievementType.LoyaltyGold] = "Gold Loyalty";
        achievementNames[AchievementType.LoyaltyPlatinum] = "Platinum Loyalty";
        achievementNames[AchievementType.ReferralMaster] = "Referral Master";
        achievementNames[AchievementType.YieldEarner] = "Yield Earner";
        achievementNames[AchievementType.ContrarianMaster] = "Contrarian Master";

        achievementDescriptions[AchievementType.FirstWin] = "Won your first game in Inverse Arena";
        achievementDescriptions[AchievementType.TenGameStreak] = "Won 10 games in a row";
        achievementDescriptions[AchievementType.TournamentChampion] = "Won a scheduled tournament";
        achievementDescriptions[AchievementType.LoyaltyBronze] = "Reached Bronze loyalty tier";
        achievementDescriptions[AchievementType.LoyaltySilver] = "Reached Silver loyalty tier";
        achievementDescriptions[AchievementType.LoyaltyGold] = "Reached Gold loyalty tier";
        achievementDescriptions[AchievementType.LoyaltyPlatinum] = "Reached Platinum loyalty tier";
        achievementDescriptions[AchievementType.ReferralMaster] = "Referred 10 active players";
        achievementDescriptions[AchievementType.YieldEarner] = "Earned 100 tokens from yield";
        achievementDescriptions[AchievementType.ContrarianMaster] = "Won by choosing minority 50+ times";
    }

    // ============ External Functions ============

    /**
     * @notice Mint an achievement NFT
     * @param to Recipient address
     * @param achievementType Type of achievement
     * @param gameId Associated game ID (if applicable)
     */
    function mintAchievement(
        address to,
        uint8 achievementType,
        uint256 gameId
    ) external override {
        // Only authorized contracts (GameManager) can mint
        require(msg.sender == owner() || _isAuthorizedMinter(msg.sender), "Not authorized to mint");
        require(to != address(0), "Cannot mint to zero address");
        require(achievementType <= uint8(AchievementType.ContrarianMaster), "Invalid achievement type");

        AchievementType aType = AchievementType(achievementType);

        // Check if user already has this achievement (some achievements can be earned multiple times)
        bool canMintMultiple = aType == AchievementType.TournamentChampion || 
                              aType == AchievementType.YieldEarner;
        
        if (!canMintMultiple && hasAchievement[to][aType]) {
            revert("Achievement already earned");
        }

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Mint NFT
        _safeMint(to, tokenId);

        // Store achievement data
        achievements[tokenId] = Achievement({
            tokenId: tokenId,
            achievementType: aType,
            gameId: gameId,
            timestamp: block.timestamp,
            metadataURI: string(abi.encodePacked(baseURI, _toString(tokenId)))
        });

        // Update user mappings
        userAchievements[to].push(tokenId);
        hasAchievement[to][aType] = true;
        userAchievementCount[to]++;

        // Set token URI
        _setTokenURI(tokenId, achievements[tokenId].metadataURI);

        emit AchievementMinted(to, tokenId, aType, gameId);
    }

    /**
     * @notice Check if user has a specific achievement
     * @param user User address
     * @param achievementType Achievement type
     * @return hasAchievement_ True if user has the achievement
     */
    function hasAchievementType(
        address user,
        uint8 achievementType
    ) external view returns (bool hasAchievement_) {
        require(achievementType <= uint8(AchievementType.ContrarianMaster), "Invalid achievement type");
        return hasAchievement[user][AchievementType(achievementType)];
    }

    /**
     * @notice Get all achievements for a user
     * @param user User address
     * @return tokenIds Array of achievement token IDs
     */
    function getUserAchievements(
        address user
    ) external view override returns (uint256[] memory tokenIds) {
        return userAchievements[user];
    }

    /**
     * @notice Get achievement details
     */
    function getAchievement(uint256 tokenId) external view returns (
        AchievementType achievementType,
        uint256 gameId,
        uint256 timestamp,
        string memory metadataURI
    ) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        Achievement memory achievement = achievements[tokenId];
        return (
            achievement.achievementType,
            achievement.gameId,
            achievement.timestamp,
            achievement.metadataURI
        );
    }

    /**
     * @notice Get achievement name
     */
    function getAchievementName(AchievementType aType) external view returns (string memory) {
        return achievementNames[aType];
    }

    /**
     * @notice Get achievement description
     */
    function getAchievementDescription(AchievementType aType) external view returns (string memory) {
        return achievementDescriptions[aType];
    }

    // ============ Internal Functions ============

    /**
     * @notice Check if address is authorized to mint
     */
    function _isAuthorizedMinter(address minter) internal view returns (bool) {
        // In production, this would check against a whitelist of authorized contracts
        // For now, only owner can mint
        return minter == owner();
    }

    /**
     * @notice Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set base URI for token metadata
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        baseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @notice Update achievement metadata
     */
    function updateAchievementMetadata(
        AchievementType aType,
        string memory name,
        string memory description
    ) external onlyOwner {
        achievementNames[aType] = name;
        achievementDescriptions[aType] = description;
    }

    /**
     * @notice Authorize a contract to mint achievements
     */
    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        // This would update a mapping in production
        // For now, handled by _isAuthorizedMinter
    }

    // ============ Override Functions ============

    /**
     * @notice Override tokenURI to return metadata
     */
    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Override supportsInterface
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
