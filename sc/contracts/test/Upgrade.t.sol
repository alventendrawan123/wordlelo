// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { WordleGame } from "../src/WordleGame.sol";

/// @dev A trivial V2 implementation used only to exercise the UUPS upgrade path.
///      Adds no storage (keeps layout compatible); just a new function.
contract WordleGameV2 is WordleGame {
    function isV2() external pure returns (bool) {
        return true;
    }
}

contract UpgradeTest is Test {
    WordleGame internal game;

    address internal admin = makeAddr("admin");
    address internal wordSetter = makeAddr("wordSetter");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant DAY = 7;
    bytes32 internal constant COMMIT = keccak256("commit-x");

    function setUp() public {
        WordleGame impl = new WordleGame();
        bytes memory initData = abi.encodeCall(WordleGame.initialize, (admin));
        game = WordleGame(address(new ERC1967Proxy(address(impl), initData)));

        bytes32 role = game.WORD_SETTER_ROLE();
        vm.prank(admin);
        game.grantRole(role, wordSetter);
    }

    function test_UpgradePreservesStateAndAddsBehavior() public {
        // Pre-upgrade state.
        vm.prank(wordSetter);
        game.commitWord(DAY, COMMIT);

        WordleGameV2 v2 = new WordleGameV2();
        vm.prank(admin);
        game.upgradeToAndCall(address(v2), "");

        // New behavior is live...
        assertTrue(WordleGameV2(address(game)).isV2(), "v2 behavior");
        // ...and prior state + roles survive the upgrade.
        assertEq(game.wordCommit(DAY), COMMIT, "state preserved");
        assertTrue(game.hasRole(game.UPGRADER_ROLE(), admin), "roles preserved");
    }

    function test_UpgradeRevertsForNonUpgrader() public {
        WordleGameV2 v2 = new WordleGameV2();
        vm.prank(stranger);
        vm.expectRevert(); // AccessControlUnauthorizedAccount
        game.upgradeToAndCall(address(v2), "");
    }
}
