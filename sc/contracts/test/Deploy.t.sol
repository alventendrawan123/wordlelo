// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { Deploy } from "../script/Deploy.s.sol";
import { WordleGame } from "../src/WordleGame.sol";

contract DeployTest is Test {
    Deploy internal deployScript;
    address internal admin = makeAddr("admin");

    function setUp() public {
        deployScript = new Deploy();
    }

    function test_DeployWiresProxyAndAdminRoles() public {
        (WordleGame game, WordleGame impl, address proxy) = deployScript.deploy(admin);

        assertTrue(proxy != address(0), "proxy deployed");
        assertTrue(address(impl) != address(0), "impl deployed");
        assertTrue(proxy != address(impl), "proxy distinct from impl");

        assertEq(game.version(), "0.1.0");
        assertTrue(game.hasRole(game.DEFAULT_ADMIN_ROLE(), admin), "admin");
        assertTrue(game.hasRole(game.UPGRADER_ROLE(), admin), "upgrader");
        assertTrue(game.hasRole(game.PAUSER_ROLE(), admin), "pauser");

        // Backend roles are wired by run(), not deploy().
        assertFalse(game.hasRole(game.WORD_SETTER_ROLE(), admin));
        assertFalse(game.hasRole(game.SETTLER_ROLE(), admin));
    }

    function test_ImplementationIsInitializerLocked() public {
        (, WordleGame impl,) = deployScript.deploy(admin);
        vm.expectRevert();
        impl.initialize(admin);
    }
}
