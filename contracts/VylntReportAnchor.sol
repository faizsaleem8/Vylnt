// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

/// Digest identity only: this contract does not attest to scan or model quality.
contract VylntReportAnchor {
    address public immutable writer;
    bytes32 public immutable instanceId;
    mapping(bytes32 => uint256) public anchoredAt;
    event Anchored(bytes32 indexed digest, uint256 blockNumber);

    constructor(bytes32 instance) {
        require(instance != bytes32(0), "Empty instance");
        writer = msg.sender;
        instanceId = instance;
    }

    function anchor(bytes32 digest) external {
        require(msg.sender == writer, "Writer only");
        require(digest != bytes32(0), "Empty digest");
        if (anchoredAt[digest] != 0) return;
        anchoredAt[digest] = block.number;
        emit Anchored(digest, block.number);
    }
}
