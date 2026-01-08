# Inverse Arena - Testing Guide

## Overview

This document describes the comprehensive test suite for Inverse Arena smart contracts. All tests are written using Foundry (Forge) and follow best practices for smart contract testing.

## Test Structure

```
contract/test/
├── helpers/
│   └── TestHelpers.sol          # Shared test setup and utilities
├── mocks/
│   ├── MockVRFCoordinator.sol   # Mock Chainlink VRF for testing
│   └── MockERC20.sol             # Mock ERC20 tokens (USDT0, mETH)
├── GameManager.t.sol             # GameManager contract tests
├── YieldVault.t.sol              # YieldVault contract tests (TODO)
├── NFTAchievements.t.sol         # NFTAchievements contract tests (TODO)
├── Matchmaking.t.sol             # Matchmaking contract tests (TODO)
└── Integration.t.sol              # End-to-end integration tests (TODO)
```

## Running Tests

### Run All Tests

```bash
forge test
```

### Run Specific Test File

```bash
forge test --match-path test/GameManager.t.sol
```

### Run Specific Test Function

```bash
forge test --match-test testCreateQuickPlayGameMNT
```

### Run with Verbose Output

```bash
forge test -vvv
```

### Run with Gas Reporting

```bash
forge test --gas-report
```

### Run Coverage

```bash
forge coverage
```

## Test Coverage

### GameManager Tests

#### Game Creation Tests

- ✅ `testCreateQuickPlayGameMNT` - Create game with native MNT
- ✅ `testCreateQuickPlayGameUSDT0` - Create game with USDT0
- ✅ `testCreateQuickPlayGameMETH` - Create game with mETH
- ✅ `testCreatePrivateRoom` - Create private room
- ✅ `testFailCreateGameWithInvalidEntryFee` - Reject invalid entry fees
- ✅ `testFailCreateGameWithInvalidMaxPlayers` - Reject invalid player counts

#### Join Game Tests

- ✅ `testJoinGameMNT` - Join game with native MNT
- ✅ `testJoinGameUSDT0` - Join game with USDT0
- ✅ `testAutoStartWhenMinPlayersReached` - Auto-start when min players join
- ✅ `testFailJoinGameWithWrongAmount` - Reject wrong entry fee
- ✅ `testFailJoinFullGame` - Reject joining full game

#### Choice Making Tests

- ✅ `testMakeChoice` - Players can make choices
- ✅ `testFailMakeChoiceTwice` - Prevent double choices
- ✅ `testFailMakeChoiceBeforeGameStarts` - Prevent choices before game starts

#### View Function Tests

- ✅ `testGetGame` - Retrieve game information
- ✅ `testGetGamePlayers` - Get list of players
- ✅ `testGetPlayerInfo` - Get player-specific info
- ✅ `testGetStats` - Get global statistics

#### Admin Function Tests

- ✅ `testSetPlatformFee` - Update platform fee
- ✅ `testFailSetPlatformFeeTooHigh` - Reject fees > 10%
- ✅ `testFailSetPlatformFeeNotOwner` - Reject non-owner calls
- ✅ `testUpdateContracts` - Update contract addresses
- ✅ `testFailUpdateContractsNotOwner` - Reject non-owner calls

### YieldVault Tests (TODO)

- Deposit functions (USDT0, mETH, Aave)
- Yield calculation
- Yield distribution
- Protocol management
- TVL tracking

### NFTAchievements Tests (TODO)

- Achievement minting
- Achievement tracking
- Metadata management
- Authorization checks

### Matchmaking Tests (TODO)

- Queue management
- Player matching
- Wait time estimation
- Config updates

### Integration Tests (TODO)

- Complete game flow (creation → joining → rounds → completion)
- Multi-currency game flows
- Yield generation and distribution
- NFT achievement minting on win

## Test Helpers

### TestHelpers Contract

The `TestHelpers` contract provides:

1. **Contract Deployment**: Automatically deploys all contracts with proper configuration
2. **Test Accounts**: Pre-configured player addresses with funding
3. **Token Setup**: Mock USDT0 and mETH tokens with balances
4. **Helper Functions**:
   - `fulfillVRF()` - Simulate VRF callback
   - `createGameWithMinPlayers()` - Create and populate game to minimum players

### Mock Contracts

#### MockVRFCoordinator

- Simulates Chainlink VRF for testing
- Allows manual fulfillment of random word requests
- Tracks request IDs and consumers

#### MockERC20

- Standard ERC20 implementation
- Configurable decimals (USDT0: 6, mETH: 18)
- Mint/burn functions for testing

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on others
2. **Clear Naming**: Test names describe what they test
3. **Edge Cases**: Tests cover both success and failure paths
4. **Events**: Verify events are emitted correctly
5. **State Changes**: Verify state changes after operations
6. **Access Control**: Test owner-only functions reject non-owners

## Continuous Integration

Tests should be run:

- Before every commit
- In CI/CD pipeline
- Before deployment to testnet/mainnet

## Next Steps

1. Complete YieldVault tests
2. Complete NFTAchievements tests
3. Complete Matchmaking tests
4. Add integration tests
5. Add fuzz testing for edge cases
6. Add invariant testing
7. Achieve >90% code coverage

## Notes

- VRF testing requires mocking since we can't call real Chainlink VRF in tests
- Token approvals must be set before calling functions that transfer tokens
- Game state transitions must be tested carefully (Waiting → InProgress → Completed)
- Yield calculations should be tested with time manipulation using `vm.warp()`
