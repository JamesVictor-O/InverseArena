// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IYieldVault.sol";

/**
 * @title YieldVault
 * @notice Manages yield generation from staked game funds using RWA protocols
 * @dev Integrates with Mantle's yield-generating protocols (mETH, USDT0)
 */
contract YieldVault is IYieldVault, Ownable, ReentrancyGuard {
    // ============ Structs ============

    struct GameDeposit {
        uint256 gameId;
        uint256 amount;
        uint256 shares;
        uint256 timestamp;
        uint8 protocol;
        bool active;
    }

    struct ProtocolInfo {
        address protocolAddress;
        bool enabled;
        uint256 totalDeposited;
        uint256 totalShares;
    }

    // ============ State Variables ============

    mapping(uint256 => GameDeposit) public gameDeposits;
    mapping(uint8 => ProtocolInfo) public protocols;
    mapping(uint256 => uint256) public gameYield; // gameId => accumulated yield

    uint256 public totalValueLocked;
    uint256 public totalShares;

    // Protocol identifiers
    uint8 public constant PROTOCOL_METH = 0;
    uint8 public constant PROTOCOL_USDT0 = 1;

    // Yield calculation parameters
    uint256 public constant YIELD_APY_BPS = 500; // 5% APY (500 basis points)
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    // ============ Events ============

    event Deposited(
        uint256 indexed gameId,
        uint256 amount,
        uint256 shares,
        uint8 protocol
    );

    event Withdrawn(
        uint256 indexed gameId,
        uint256 shares,
        uint256 amount
    );

    event YieldDistributed(
        uint256 indexed gameId,
        address indexed winner,
        uint256 yieldAmount
    );

    event ProtocolUpdated(
        uint8 protocolId,
        address protocolAddress,
        bool enabled
    );

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {
        // Initialize with placeholder addresses - update after deployment
        // In production, these would be actual protocol addresses
        protocols[PROTOCOL_METH].enabled = true;
        protocols[PROTOCOL_USDT0].enabled = true;
    }

    // ============ External Functions ============

    /**
     * @notice Deposit funds into yield-generating protocol
     * @param amount Amount to deposit
     * @param protocol Protocol identifier (0 = mETH, 1 = USDT0)
     * @return shares Amount of shares received
     */
    function depositToYield(
        uint256 amount,
        uint8 protocol
    ) external payable override nonReentrant returns (uint256 shares) {
        require(msg.value >= amount, "Insufficient payment");
        require(protocols[protocol].enabled, "Protocol not enabled");

        // For now, we'll simulate yield generation
        // In production, this would interact with actual yield protocols
        shares = _calculateShares(amount, protocol);

        // Store deposit info (using gameId = 0 for general deposits)
        // In practice, gameId would be passed from GameManager
        uint256 gameId = _getNextGameId();
        gameDeposits[gameId] = GameDeposit({
            gameId: gameId,
            amount: amount,
            shares: shares,
            timestamp: block.timestamp,
            protocol: protocol,
            active: true
        });

        totalValueLocked += amount;
        totalShares += shares;
        protocols[protocol].totalDeposited += amount;
        protocols[protocol].totalShares += shares;

        emit Deposited(gameId, amount, shares, protocol);
        return shares;
    }

    /**
     * @notice Deposit for a specific game
     * @param gameId Game ID
     * @param protocol Protocol identifier
     */
    function depositForGame(
        uint256 gameId,
        uint8 protocol
    ) external payable nonReentrant returns (uint256 shares) {
        require(msg.value > 0, "Amount must be greater than 0");
        require(protocols[protocol].enabled, "Protocol not enabled");

        shares = _calculateShares(msg.value, protocol);

        gameDeposits[gameId] = GameDeposit({
            gameId: gameId,
            amount: msg.value,
            shares: shares,
            timestamp: block.timestamp,
            protocol: protocol,
            active: true
        });

        totalValueLocked += msg.value;
        totalShares += shares;
        protocols[protocol].totalDeposited += msg.value;
        protocols[protocol].totalShares += shares;

        emit Deposited(gameId, msg.value, shares, protocol);
        return shares;
    }

    /**
     * @notice Withdraw funds from yield protocol
     * @param shares Amount of shares to withdraw
     * @return amount Amount of tokens received
     */
    function withdrawFromYield(
        uint256 shares
    ) external override nonReentrant returns (uint256 amount) {
        require(shares > 0, "Invalid shares");
        require(shares <= totalShares, "Insufficient shares");

        amount = _calculateAmountFromShares(shares);
        totalShares -= shares;
        totalValueLocked -= amount;

        payable(msg.sender).transfer(amount);

        emit Withdrawn(0, shares, amount);
        return amount;
    }

    /**
     * @notice Get accumulated yield for a game
     * @param gameId Game ID
     * @return yieldAmount Total yield accumulated
     */
    function getAccumulatedYield(
        uint256 gameId
    ) external view override returns (uint256 yieldAmount) {
        GameDeposit memory deposit = gameDeposits[gameId];
        if (!deposit.active || deposit.amount == 0) {
            return 0;
        }

        // Calculate yield based on time elapsed
        uint256 timeElapsed = block.timestamp - deposit.timestamp;
        yieldAmount = (deposit.amount * YIELD_APY_BPS * timeElapsed) / (SECONDS_PER_YEAR * 10000);

        return yieldAmount;
    }

    /**
     * @notice Distribute yield to game winner
     * @param gameId Game ID
     * @param winner Winner address
     */
    function distributeYield(
        uint256 gameId,
        address winner
    ) external override nonReentrant {
        GameDeposit memory deposit = gameDeposits[gameId];
        require(deposit.active, "Deposit not active");

        uint256 yieldAmount = this.getAccumulatedYield(gameId);
        require(yieldAmount > 0, "No yield to distribute");

        gameYield[gameId] = yieldAmount;
        gameDeposits[gameId].active = false;

        // Withdraw original deposit + yield
        uint256 totalAmount = deposit.amount + yieldAmount;
        totalValueLocked -= deposit.amount;
        totalShares -= deposit.shares;
        protocols[deposit.protocol].totalDeposited -= deposit.amount;
        protocols[deposit.protocol].totalShares -= deposit.shares;

        payable(winner).transfer(totalAmount);

        emit YieldDistributed(gameId, winner, yieldAmount);
    }

    /**
     * @notice Get total value locked in yield protocols
     * @return totalValue Total value in native token
     */
    function getTotalValueLocked() external view override returns (uint256 totalValue) {
        return totalValueLocked;
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculate shares from amount
     */
    function _calculateShares(
        uint256 amount,
        uint8 protocol
    ) internal view returns (uint256) {
        // Simplified calculation - in production, this would use actual protocol logic
        if (totalShares == 0) {
            return amount; // 1:1 for first deposit
        }
        return (amount * totalShares) / totalValueLocked;
    }

    /**
     * @notice Calculate amount from shares
     */
    function _calculateAmountFromShares(
        uint256 shares
    ) internal view returns (uint256) {
        if (totalShares == 0) {
            return 0;
        }
        return (shares * totalValueLocked) / totalShares;
    }

    /**
     * @notice Get next game ID (simplified - in production would track from GameManager)
     */
    function _getNextGameId() internal view returns (uint256) {
        // This is a placeholder - in production, GameManager would pass the gameId
        return block.timestamp;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update protocol address and status
     */
    function updateProtocol(
        uint8 protocolId,
        address protocolAddress,
        bool enabled
    ) external onlyOwner {
        protocols[protocolId].protocolAddress = protocolAddress;
        protocols[protocolId].enabled = enabled;
        emit ProtocolUpdated(protocolId, protocolAddress, enabled);
    }

    /**
     * @notice Set yield APY (in basis points)
     */
    function setYieldAPY(uint256 newAPYBps) external onlyOwner {
        require(newAPYBps <= 2000, "APY too high"); // Max 20%
        // This would update the yield calculation
        // For now, we use a constant, but this could be made dynamic
    }

    /**
     * @notice Emergency withdraw (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @notice Receive native tokens
     */
    receive() external payable {
        // Allow contract to receive ETH
    }
}
