// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "chainlink-brownie-contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title MockVRFCoordinator
 * @notice Mock VRF Coordinator for testing
 */
contract MockVRFCoordinator is VRFCoordinatorV2Interface {
    mapping(uint256 => address) public requestConsumers;
    mapping(uint256 => uint256[]) public fulfilledRandomWords;
    uint256 public requestIdCounter;

    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external override returns (uint256 requestId) {
        requestId = requestIdCounter++;
        requestConsumers[requestId] = msg.sender;
        return requestId;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        address consumer = requestConsumers[requestId];
        require(consumer != address(0), "Invalid request ID");
        fulfilledRandomWords[requestId] = randomWords;
        
        // Call the consumer's rawFulfillRandomWords function (from VRFConsumerBaseV2)
        (bool success, ) = consumer.call(
            abi.encodeWithSelector(
                bytes4(keccak256("rawFulfillRandomWords(uint256,uint256[])")),
                requestId,
                randomWords
            )
        );
        require(success, "Fulfillment failed");
    }

    // Unused interface functions
    function getRequestConfig() external pure override returns (uint16, uint32, bytes32[] memory) {
        revert("Not implemented");
    }

    function requestSubscriptionOwnerTransfer(uint64, address) external pure override {
        revert("Not implemented");
    }

    function acceptSubscriptionOwnerTransfer(uint64) external pure override {
        revert("Not implemented");
    }

    function createSubscription() external pure override returns (uint64) {
        revert("Not implemented");
    }

    function getSubscription(uint64) external pure override returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers) {
        revert("Not implemented");
    }
    
    function addConsumer(uint64, address) external pure override {
        revert("Not implemented");
    }
    
    function removeConsumer(uint64, address) external pure override {
        revert("Not implemented");
    }

    function cancelSubscription(uint64, address) external pure override {
        revert("Not implemented");
    }

    function pendingRequestExists(uint64) external pure override returns (bool) {
        revert("Not implemented");
    }
}
