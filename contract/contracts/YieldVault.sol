// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IYieldVault.sol";


contract YieldVault is IYieldVault, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct GameDeposit {
        uint256 gameId;
        address currency;           // Token address (USDT0, mETH, or native MNT)
        uint256 amount;
        uint256 shares;
        uint256 timestamp;
        uint8 protocol;             // 0=mETH, 1=USDT0, 2=Aave, 3=Ondo USDY
        uint256 initialAPY;         // APY at deposit time (in basis points)
        bool active;
    }

    struct ProtocolInfo {
        address protocolAddress;
        bool enabled;
        uint256 totalDeposited;
        uint256 totalShares;
        uint256 currentAPY;         // Current APY in basis points
        string name;
    }

    struct YieldSnapshot {
        uint256 timestamp;
        uint256 totalYield;
        uint256 apy;
    }

    // ============ State Variables ============

    // Core mappings
    mapping(uint256 => GameDeposit) public gameDeposits;
    mapping(uint8 => ProtocolInfo) public protocols;
    mapping(uint256 => uint256) public gameYield;
    mapping(uint256 => YieldSnapshot[]) public yieldHistory;
    
    // Asset tracking
    mapping(address => uint256) public totalValueLockedByAsset;
    mapping(address => uint256) public totalSharesByAsset;
    
    uint256 public totalValueLocked;
    uint256 public totalYieldGenerated;

    // ============ Protocol Identifiers ============
    
    uint8 public constant PROTOCOL_METH = 0;
    uint8 public constant PROTOCOL_USDT0 = 1;
    uint8 public constant PROTOCOL_AAVE = 2;
    uint8 public constant PROTOCOL_ONDO_USDY = 3;

    // ============ Token Addresses (Mantle Network) ============
    
    // CRITICAL: Update these with actual Mantle mainnet addresses before deployment
    address public USDT0;           // Mantle's yield-bearing stablecoin
    address public mETH;            // Mantle Staked ETH
    address public aavePool;        // Aave V3 Pool on Mantle
    address public ondoUSDY;        // Ondo Finance USDY (if available)
    address public MNT;             // Native Mantle token
    
    // Aave-specific
    address public aUSDT0;          // Aave interest-bearing USDT0
    address public amETH;           // Aave interest-bearing mETH

    // ============ APY Configuration ============
    
    // Default APYs (in basis points, 1 bp = 0.01%)
    uint256 public mETH_APY = 400;      // 4% - Ethereum staking yield
    uint256 public USDT0_APY = 500;     // 5% - Compliant stablecoin yield
    uint256 public AAVE_APY = 600;      // 6% - DeFi lending yield
    uint256 public USDY_APY = 450;      // 4.5% - Ondo RWA yield
    
    uint256 public constant SECONDS_PER_YEAR = 31536000;
    uint256 public constant BASIS_POINTS = 10000;

    // ============ Events ============

    event DepositedToProtocol(
        uint256 indexed gameId,
        address indexed currency,
        uint256 amount,
        uint256 shares,
        uint8 protocol,
        string protocolName
    );

    event WithdrawnFromProtocol(
        uint256 indexed gameId,
        uint256 shares,
        uint256 amount,
        uint256 yieldEarned
    );

    event YieldDistributed(
        uint256 indexed gameId,
        address indexed winner,
        uint256 principalAmount,
        uint256 yieldAmount,
        uint256 totalPayout
    );

    event ProtocolUpdated(
        uint8 protocolId,
        address protocolAddress,
        bool enabled,
        uint256 apy
    );

    event APYUpdated(
        uint8 protocolId,
        uint256 oldAPY,
        uint256 newAPY
    );

    event RealTimeYieldSnapshot(
        uint256 indexed gameId,
        uint256 timestamp,
        uint256 yieldAccumulated,
        uint256 currentAPY
    );

    // ============ Constructor ============

    constructor(
        address _usdt0,
        address _mETH,
        address _aavePool,
        address _mnt
    ) Ownable(msg.sender) {
        require(_usdt0 != address(0), "Invalid USDT0 address");
        require(_mETH != address(0), "Invalid mETH address");
        
        USDT0 = _usdt0;
        mETH = _mETH;
        aavePool = _aavePool;
        MNT = _mnt;

        // Initialize protocol info
        protocols[PROTOCOL_METH] = ProtocolInfo({
            protocolAddress: _mETH,
            enabled: true,
            totalDeposited: 0,
            totalShares: 0,
            currentAPY: mETH_APY,
            name: "Mantle Staked ETH (mETH)"
        });

        protocols[PROTOCOL_USDT0] = ProtocolInfo({
            protocolAddress: _usdt0,
            enabled: true,
            totalDeposited: 0,
            totalShares: 0,
            currentAPY: USDT0_APY,
            name: "USDT0 Yield-Bearing Stablecoin"
        });

        protocols[PROTOCOL_AAVE] = ProtocolInfo({
            protocolAddress: _aavePool,
            enabled: false, // Enable after Aave integration setup
            totalDeposited: 0,
            totalShares: 0,
            currentAPY: AAVE_APY,
            name: "Aave V3 Lending"
        });
    }

    // ============ Core Deposit Functions ============

    /**
     * @notice Deposit USDT0 into yield vault
     * @param gameId Associated game ID
     * @param amount Amount of USDT0 to deposit
     * @return shares Shares received
     */
    function depositUSDT0(
        uint256 gameId,
        uint256 amount
    ) external nonReentrant returns (uint256 shares) {
        require(protocols[PROTOCOL_USDT0].enabled, "USDT0 protocol disabled");
        require(amount > 0, "Amount must be > 0");

        // Transfer USDT0 from sender
        IERC20(USDT0).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate shares
        shares = _calculateShares(amount, USDT0, PROTOCOL_USDT0);

        // Store deposit
        _storeDeposit(gameId, USDT0, amount, shares, PROTOCOL_USDT0);

        emit DepositedToProtocol(
            gameId,
            USDT0,
            amount,
            shares,
            PROTOCOL_USDT0,
            "USDT0 Yield-Bearing Stablecoin"
        );

        return shares;
    }

    /**
     * @notice Deposit mETH for Ethereum staking yield
     * @param gameId Associated game ID
     * @param amount Amount of mETH to deposit
     * @return shares Shares received
     */
    function depositMETH(
        uint256 gameId,
        uint256 amount
    ) external nonReentrant returns (uint256 shares) {
        require(protocols[PROTOCOL_METH].enabled, "mETH protocol disabled");
        require(amount > 0, "Amount must be > 0");

        // Transfer mETH from sender
        IERC20(mETH).safeTransferFrom(msg.sender, address(this), amount);

        shares = _calculateShares(amount, mETH, PROTOCOL_METH);
        _storeDeposit(gameId, mETH, amount, shares, PROTOCOL_METH);

        emit DepositedToProtocol(
            gameId,
            mETH,
            amount,
            shares,
            PROTOCOL_METH,
            "Mantle Staked ETH"
        );

        return shares;
    }

    /**
     * @notice Deposit to Aave lending pool
     * @param gameId Associated game ID
     * @param asset Asset address (USDT0 or mETH)
     * @param amount Amount to deposit
     * @return shares Shares received
     */
    function depositToAave(
        uint256 gameId,
        address asset,
        uint256 amount
    ) external nonReentrant returns (uint256 shares) {
        require(protocols[PROTOCOL_AAVE].enabled, "Aave protocol disabled");
        require(asset == USDT0 || asset == mETH, "Invalid asset");
        require(amount > 0, "Amount must be > 0");

        // Transfer asset from sender
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Approve Aave pool (use forceApprove for safe approval handling)
        IERC20(asset).forceApprove(aavePool, amount);

        // Deposit to Aave (simplified - actual implementation would use Aave interface)
        // IPool(aavePool).supply(asset, amount, address(this), 0);

        shares = _calculateShares(amount, asset, PROTOCOL_AAVE);
        _storeDeposit(gameId, asset, amount, shares, PROTOCOL_AAVE);

        emit DepositedToProtocol(
            gameId,
            asset,
            amount,
            shares,
            PROTOCOL_AAVE,
            "Aave V3 Lending"
        );

        return shares;
    }

 
    function depositToYield(
        uint256 amount,
        uint8 protocol
    ) external payable override nonReentrant returns (uint256 shares) {
        require(msg.value >= amount, "Insufficient payment");
        require(protocols[protocol].enabled, "Protocol not enabled");

        shares = _calculateShares(amount, address(0), protocol);
        _storeDeposit(0, address(0), amount, shares, protocol);

        emit DepositedToProtocol(
            0,
            address(0),
            amount,
            shares,
            protocol,
            protocols[protocol].name
        );

        return shares;
    }

    // ============ Yield Calculation & Distribution ============

    /**
     * @notice Get real-time accumulated yield for a game
     * @param gameId Game ID
     * @return yieldAmount Total yield generated
     */
    function getAccumulatedYield(
        uint256 gameId
    ) external view override returns (uint256 yieldAmount) {
        GameDeposit memory deposit = gameDeposits[gameId];
        if (!deposit.active || deposit.amount == 0) {
            return 0;
        }

        // Calculate time-weighted yield
        uint256 timeElapsed = block.timestamp - deposit.timestamp;
        uint256 apy = protocols[deposit.protocol].currentAPY;
        
        // Formula: yield = principal * apy * time / (year * basis_points)
        yieldAmount = (deposit.amount * apy * timeElapsed) / (SECONDS_PER_YEAR * BASIS_POINTS);

        return yieldAmount;
    }

    /**
     * @notice Get detailed yield breakdown
     * @param gameId Game ID
     */
    function getYieldBreakdown(
        uint256 gameId
    ) external view returns (
        uint256 principal,
        uint256 yieldGenerated,
        uint256 currentAPY,
        uint256 timeElapsed,
        string memory protocolName
    ) {
        GameDeposit memory deposit = gameDeposits[gameId];
        
        principal = deposit.amount;
        yieldGenerated = this.getAccumulatedYield(gameId);
        currentAPY = protocols[deposit.protocol].currentAPY;
        timeElapsed = block.timestamp - deposit.timestamp;
        protocolName = protocols[deposit.protocol].name;

        return (principal, yieldGenerated, currentAPY, timeElapsed, protocolName);
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
        GameDeposit storage deposit = gameDeposits[gameId];
        require(deposit.active, "Deposit not active");
        require(winner != address(0), "Invalid winner");

        uint256 yieldAmount = this.getAccumulatedYield(gameId);
        uint256 totalPayout = deposit.amount + yieldAmount;

        // Update state
        gameYield[gameId] = yieldAmount;
        totalYieldGenerated += yieldAmount;
        deposit.active = false;

        // Update protocol totals
        ProtocolInfo storage protocol = protocols[deposit.protocol];
        protocol.totalDeposited -= deposit.amount;
        protocol.totalShares -= deposit.shares;
        
        totalValueLocked -= deposit.amount;
        totalValueLockedByAsset[deposit.currency] -= deposit.amount;

        // Transfer principal + yield to winner
        if (deposit.currency == address(0)) {
            // Native token
            payable(winner).transfer(totalPayout);
        } else {
            // ERC20 token
            IERC20(deposit.currency).safeTransfer(winner, totalPayout);
        }

        // Record yield snapshot
        yieldHistory[gameId].push(YieldSnapshot({
            timestamp: block.timestamp,
            totalYield: yieldAmount,
            apy: protocol.currentAPY
        }));

        emit YieldDistributed(gameId, winner, deposit.amount, yieldAmount, totalPayout);
    }

    /**
     * @notice Emit real-time yield update (call during gameplay)
     * @param gameId Game ID
     */
    function emitYieldSnapshot(uint256 gameId) external {
        GameDeposit memory deposit = gameDeposits[gameId];
        require(deposit.active, "Deposit not active");

        uint256 currentYield = this.getAccumulatedYield(gameId);
        uint256 currentAPY = protocols[deposit.protocol].currentAPY;

        emit RealTimeYieldSnapshot(gameId, block.timestamp, currentYield, currentAPY);
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculate shares from deposit amount
     */
    function _calculateShares(
        uint256 amount,
        address asset,
        uint8 protocol
    ) internal view returns (uint256) {
        uint256 assetShares = totalSharesByAsset[asset];
        uint256 assetTVL = totalValueLockedByAsset[asset];

        if (assetShares == 0 || assetTVL == 0) {
            return amount; // 1:1 for first deposit
        }

        return (amount * assetShares) / assetTVL;
    }

    /**
     * @notice Store deposit information
     */
    function _storeDeposit(
        uint256 gameId,
        address currency,
        uint256 amount,
        uint256 shares,
        uint8 protocol
    ) internal {
        gameDeposits[gameId] = GameDeposit({
            gameId: gameId,
            currency: currency,
            amount: amount,
            shares: shares,
            timestamp: block.timestamp,
            protocol: protocol,
            initialAPY: protocols[protocol].currentAPY,
            active: true
        });

        // Update totals
        totalValueLocked += amount;
        totalValueLockedByAsset[currency] += amount;
        totalSharesByAsset[currency] += shares;
        
        ProtocolInfo storage protocolInfo = protocols[protocol];
        protocolInfo.totalDeposited += amount;
        protocolInfo.totalShares += shares;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update protocol configuration
     */
    function updateProtocol(
        uint8 protocolId,
        address protocolAddress,
        bool enabled,
        uint256 apy,
        string memory name
    ) external onlyOwner {
        require(apy <= 2000, "APY too high"); // Max 20%
        
        ProtocolInfo storage protocol = protocols[protocolId];
        protocol.protocolAddress = protocolAddress;
        protocol.enabled = enabled;
        protocol.currentAPY = apy;
        protocol.name = name;

        emit ProtocolUpdated(protocolId, protocolAddress, enabled, apy);
    }

    /**
     * @notice Update APY for a protocol (for dynamic rate adjustments)
     */
    function updateAPY(uint8 protocolId, uint256 newAPY) external onlyOwner {
        require(newAPY <= 2000, "APY too high");
        
        uint256 oldAPY = protocols[protocolId].currentAPY;
        protocols[protocolId].currentAPY = newAPY;

        emit APYUpdated(protocolId, oldAPY, newAPY);
    }

    /**
     * @notice Set token addresses (for testnet/mainnet flexibility)
     */
    function setTokenAddresses(
        address _usdt0,
        address _mETH,
        address _aavePool,
        address _ondoUSDY,
        address _aUSDT0,
        address _amETH
    ) external onlyOwner {
        if (_usdt0 != address(0)) USDT0 = _usdt0;
        if (_mETH != address(0)) mETH = _mETH;
        if (_aavePool != address(0)) aavePool = _aavePool;
        if (_ondoUSDY != address(0)) ondoUSDY = _ondoUSDY;
        if (_aUSDT0 != address(0)) aUSDT0 = _aUSDT0;
        if (_amETH != address(0)) amETH = _amETH;
    }

    /**
     * @notice Enable/disable Aave integration
     */
    function setAaveEnabled(bool enabled) external onlyOwner {
        protocols[PROTOCOL_AAVE].enabled = enabled;
    }

    /**
     * @notice Enable/disable Ondo USDY integration
     */
    function setOndoEnabled(bool enabled) external onlyOwner {
        protocols[PROTOCOL_ONDO_USDY].enabled = enabled;
    }

    // ============ View Functions ============

    /**
     * @notice Get total value locked across all protocols
     */
    function getTotalValueLocked() external view override returns (uint256) {
        return totalValueLocked;
    }

    /**
     * @notice Get TVL by asset
     */
    function getTVLByAsset(address asset) external view returns (uint256) {
        return totalValueLockedByAsset[asset];
    }

    /**
     * @notice Get all supported protocols
     */
    function getAllProtocols() external view returns (
        string[] memory names,
        uint256[] memory apys,
        bool[] memory enabled
    ) {
        names = new string[](4);
        apys = new uint256[](4);
        enabled = new bool[](4);

        for (uint8 i = 0; i < 4; i++) {
            names[i] = protocols[i].name;
            apys[i] = protocols[i].currentAPY;
            enabled[i] = protocols[i].enabled;
        }

        return (names, apys, enabled);
    }

    /**
     * @notice Get yield history for a game
     */
    function getYieldHistory(uint256 gameId) external view returns (YieldSnapshot[] memory) {
        return yieldHistory[gameId];
    }

    // ============ Withdrawal Functions ============

    /**
     * @notice Withdraw from yield protocol (legacy function)
     */
    function withdrawFromYield(
        uint256 shares
    ) external nonReentrant returns (uint256 amount) {
        require(shares > 0, "Invalid shares");
        
        // Simplified withdrawal - in production, would handle per-asset
        amount = (shares * totalValueLocked) / totalSharesByAsset[address(0)];
        
        totalValueLocked -= amount;
        payable(msg.sender).transfer(amount);

        emit WithdrawnFromProtocol(0, shares, amount, 0);
        return amount;
    }

    // ============ Emergency Functions ============

    /**
     * @notice Emergency withdraw (owner only)
     */
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            uint256 balance = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransfer(owner(), balance);
        }
    }

    /**
     * @notice Receive native tokens
     */
    receive() external payable {}
}
