// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { WordleGame } from "../src/WordleGame.sol";

contract WordleGameTest is Test {
    WordleGame internal game;

    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        WordleGame impl = new WordleGame();
        bytes memory initData = abi.encodeCall(WordleGame.initialize, (admin));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        game = WordleGame(address(proxy));
    }

    function test_GrantsAdminRolesOnInit() public view {
        assertTrue(game.hasRole(game.DEFAULT_ADMIN_ROLE(), admin), "admin role");
        assertTrue(game.hasRole(game.UPGRADER_ROLE(), admin), "upgrader role");
        assertTrue(game.hasRole(game.PAUSER_ROLE(), admin), "pauser role");
    }

    function test_BackendRolesUnsetByDefault() public view {
        // WORD_SETTER / SETTLER are granted post-deploy to backend keys.
        assertFalse(game.hasRole(game.WORD_SETTER_ROLE(), admin));
        assertFalse(game.hasRole(game.SETTLER_ROLE(), admin));
    }

    function test_Version() public view {
        assertEq(game.version(), "0.1.0");
    }

    function test_PauseByPauser() public {
        vm.prank(admin);
        game.pause();
        assertTrue(game.paused());

        vm.prank(admin);
        game.unpause();
        assertFalse(game.paused());
    }

    function test_PauseRevertsForStranger() public {
        vm.prank(stranger);
        vm.expectRevert();
        game.pause();
    }

    function test_CannotInitializeTwice() public {
        vm.expectRevert();
        game.initialize(admin);
    }

    function test_ImplementationInitializersDisabled() public {
        WordleGame impl = new WordleGame();
        vm.expectRevert();
        impl.initialize(admin);
    }

    function test_EmptyResultAndStreakForFreshPlayer() public view {
        WordleGame.Result memory r = game.getResult(stranger, 1);
        assertEq(r.guesses, 0);
        assertFalse(r.won);

        WordleGame.Streak memory s = game.getStreak(stranger);
        assertEq(s.current, 0);
        assertEq(s.max, 0);
    }
}
