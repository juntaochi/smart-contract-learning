// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import "../contracts/3_Ballot.sol";
import "./TestUtils.sol";

contract BallotTest {
    function testWinningProposal() public {
        bytes32[] memory proposalNames = new bytes32[](1);
        proposalNames[0] = bytes32("candidate1");

        Ballot ballot = new Ballot(proposalNames);
        ballot.vote(0);

        TestUtils.assertEq(ballot.winningProposal(), 0, "proposal at index 0 should win");
        TestUtils.assertEq(ballot.winnerName(), bytes32("candidate1"), "candidate1 should be winner");
    }
}

