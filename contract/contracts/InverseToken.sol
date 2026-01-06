// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IInverseToken.sol";

/**
 * @title InverseToken
 * @notice ERC20 token for Inverse Arena with staking, governance, and utility features
 * @dev Implements staking rewards, entry fee discounts, and VIP access
 */
contract InverseToken is 
    ERC20, 
    ERC20Burnable, 
    ERC20Permit,
    ERC20Votes, 
    Ownable, 
    ReentrancyGuard,
    IInverseToken
{
    // ============ Structs ============

    struct StakingInfo {
        uint256 stakedAmount;
        uint256 stakingTimestamp;
        uint256 lastRewardClaim;
        uint256 accumulatedRewards;
    }

    // ============ State Variables ============

    mapping(address => StakingInfo) public stakingInfo;
    mapping(address => bool) public vipMembers;

    uint256 public totalStaked;
    uint256 public stakingRewardRate = 100; // 1% APY (100 basis points)
    uint256 public constant SECONDS_PER_YEAR = 31536000;
    uint256 public constant MAX_DISCOUNT = 30; // 30% max discount
    uint256 public constant VIP_THRESHOLD = 10000 * 10**18; // 10,000 tokens for VIP

    // Token distribution
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant COMMUNITY_REWARDS = 400_000_000 * 10**18; // 40%
    uint256 public constant LIQUIDITY = 200_000_000 * 10**18; // 20%
    uint256 public constant TEAM = 150_000_000 * 10**18; // 15%
    uint256 public constant ECOSYSTEM = 150_000_000 * 10**18; // 15%
    uint256 public constant PRIVATE_SALE = 100_000_000 * 10**18; // 10%

    // ============ Events ============

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event VIPStatusGranted(address indexed user);
    event VIPStatusRevoked(address indexed user);
    event StakingRewardRateUpdated(uint256 newRate);

    // ============ Constructor ============

    constructor() 
        ERC20("Inverse Arena", "INVERSE") 
        ERC20Permit("Inverse Arena")
        Ownable(msg.sender)
    {
        // Mint total supply
        _mint(msg.sender, TOTAL_SUPPLY);

        // Initial distribution (would be handled by separate contracts in production)
        // For now, owner holds all tokens and can distribute as needed
    }

    // ============ Staking Functions ============

    /**
     * @notice Stake tokens to earn rewards
     * @param amount Amount to stake
     */
    function stake(uint256 amount) external override nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        StakingInfo storage info = stakingInfo[msg.sender];

        // Claim existing rewards before staking more
        if (info.stakedAmount > 0) {
            _claimRewards(msg.sender);
        }

        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);

        // Update staking info
        info.stakedAmount += amount;
        info.stakingTimestamp = block.timestamp;
        if (info.lastRewardClaim == 0) {
            info.lastRewardClaim = block.timestamp;
        }
        totalStaked += amount;

        // Check VIP status
        if (info.stakedAmount >= VIP_THRESHOLD && !vipMembers[msg.sender]) {
            vipMembers[msg.sender] = true;
            emit VIPStatusGranted(msg.sender);
        }

        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Unstake tokens
     * @param amount Amount to unstake
     */
    function unstake(uint256 amount) external override nonReentrant {
        StakingInfo storage info = stakingInfo[msg.sender];
        require(info.stakedAmount >= amount, "Insufficient staked amount");

        // Claim rewards before unstaking
        _claimRewards(msg.sender);

        // Update staking info
        info.stakedAmount -= amount;
        totalStaked -= amount;

        // Check VIP status
        if (info.stakedAmount < VIP_THRESHOLD && vipMembers[msg.sender]) {
            vipMembers[msg.sender] = false;
            emit VIPStatusRevoked(msg.sender);
        }

        // Transfer tokens back to user
        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Claim staking rewards
     */
    function claimRewards() external nonReentrant {
        _claimRewards(msg.sender);
    }

    /**
     * @notice Internal function to claim rewards
     */
    function _claimRewards(address user) internal {
        StakingInfo storage info = stakingInfo[user];
        if (info.stakedAmount == 0) {
            return;
        }

        uint256 rewards = _calculateRewards(user);
        if (rewards > 0) {
            info.accumulatedRewards += rewards;
            info.lastRewardClaim = block.timestamp;

            // Mint new tokens as rewards
            _mint(user, rewards);

            emit RewardsClaimed(user, rewards);
        }
    }

    /**
     * @notice Calculate pending rewards for a user
     */
    function _calculateRewards(address user) internal view returns (uint256) {
        StakingInfo memory info = stakingInfo[user];
        if (info.stakedAmount == 0 || info.lastRewardClaim == 0) {
            return 0;
        }

        uint256 timeElapsed = block.timestamp - info.lastRewardClaim;
        uint256 rewards = (info.stakedAmount * stakingRewardRate * timeElapsed) / 
                         (SECONDS_PER_YEAR * 10000);

        return rewards;
    }

    // ============ View Functions ============

    /**
     * @notice Get staking rewards for a user
     * @param user User address
     * @return rewards Amount of rewards earned
     */
    function getStakingRewards(address user) external view override returns (uint256 rewards) {
        return _calculateRewards(user) + stakingInfo[user].accumulatedRewards;
    }

    /**
     * @notice Get discount percentage for entry fees based on staked amount
     * @param user User address
     * @return discount Discount percentage (0-30, representing 0-30%)
     */
    function getEntryFeeDiscount(address user) external view override returns (uint256 discount) {
        StakingInfo memory info = stakingInfo[user];
        if (info.stakedAmount == 0) {
            return 0;
        }

        // Calculate discount based on staked amount
        // 1,000 tokens = 1% discount, up to 30% max
        // Formula: min(30, stakedAmount / 1000)
        uint256 calculatedDiscount = info.stakedAmount / (1000 * 10**18);
        return calculatedDiscount > MAX_DISCOUNT ? MAX_DISCOUNT : calculatedDiscount;
    }

    /**
     * @notice Check if user has VIP access
     * @param user User address
     * @return hasAccess True if user has VIP access
     */
    function hasVIPAccess(address user) external view override returns (bool hasAccess) {
        return vipMembers[user];
    }

    /**
     * @notice Get staking info for a user
     */
    function getUserStakingInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 stakingTimestamp,
        uint256 pendingRewards,
        uint256 accumulatedRewards,
        bool isVIP
    ) {
        StakingInfo memory info = stakingInfo[user];
        return (
            info.stakedAmount,
            info.stakingTimestamp,
            _calculateRewards(user),
            info.accumulatedRewards,
            vipMembers[user]
        );
    }

    // ============ Admin Functions ============

    /**
     * @notice Set staking reward rate (in basis points)
     */
    function setStakingRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= 2000, "Rate too high"); // Max 20% APY
        stakingRewardRate = newRate;
        emit StakingRewardRateUpdated(newRate);
    }

    /**
     * @notice Manually grant VIP status
     */
    function grantVIP(address user) external onlyOwner {
        vipMembers[user] = true;
        emit VIPStatusGranted(user);
    }

    /**
     * @notice Revoke VIP status
     */
    function revokeVIP(address user) external onlyOwner {
        vipMembers[user] = false;
        emit VIPStatusRevoked(user);
    }

    /**
     * @notice Distribute tokens to community rewards pool
     */
    function distributeCommunityRewards(address recipient, uint256 amount) external onlyOwner {
        require(amount <= COMMUNITY_REWARDS, "Exceeds community rewards allocation");
        _transfer(owner(), recipient, amount);
    }

    // ============ Override Functions ============

    /**
     * @notice Override transfer to handle staking
     */
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    /**
     * @notice Override nonces for permit
     */
    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
