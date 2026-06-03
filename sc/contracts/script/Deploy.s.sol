// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script } from "forge-std/Script.sol";
import { console2 } from "forge-std/console2.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { WordleGame } from "../src/WordleGame.sol";

/// @notice Deploys WordleGame behind an ERC1967 (UUPS) proxy and wires backend roles.
contract Deploy is Script {
    /// @dev Broadcast-free deployment, so tests can drive it directly.
    /// @param admin receives DEFAULT_ADMIN / UPGRADER / PAUSER.
    function deploy(address admin)
        public
        returns (WordleGame game, WordleGame impl, address proxy)
    {
        impl = new WordleGame();
        bytes memory initData = abi.encodeCall(WordleGame.initialize, (admin));
        proxy = address(new ERC1967Proxy(address(impl), initData));
        game = WordleGame(proxy);
    }

    /// @notice Deploy + wire backend roles, broadcasting with PRIVATE_KEY.
    /// @dev Env: PRIVATE_KEY (required); ADMIN / WORD_SETTER / SETTLER (optional,
    ///      default to the deployer). Backend role grants run only when the
    ///      deployer is the admin; otherwise a separate admin grants them after.
    ///
    ///      Alfajores:
    ///        PRIVATE_KEY=0x.. forge script script/Deploy.s.sol:Deploy \
    ///          --rpc-url alfajores --broadcast --verify
    function run() external returns (WordleGame game, address proxy) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address admin = vm.envOr("ADMIN", deployer);
        address wordSetter = vm.envOr("WORD_SETTER", deployer);
        address settler = vm.envOr("SETTLER", deployer);

        vm.startBroadcast(pk);

        WordleGame impl;
        (game, impl, proxy) = deploy(admin);

        if (admin == deployer) {
            game.grantRole(game.WORD_SETTER_ROLE(), wordSetter);
            game.grantRole(game.SETTLER_ROLE(), settler);
        }

        vm.stopBroadcast();

        console2.log("WordleGame impl :", address(impl));
        console2.log("WordleGame proxy:", proxy);
        console2.log("admin           :", admin);
        console2.log("wordSetter      :", wordSetter);
        console2.log("settler         :", settler);
    }
}
