// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    UUPSUpgradeable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {
    AccessControlUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {
    PausableUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/// @title WordleGame
/// @notice On-chain settlement for the Wordlelo daily word game on Celo.
/// @dev Backend-authoritative + commit–reveal: the secret word is never written
///      on-chain until the day closes — only a commitment hash and per-player
///      results live here. UUPS-upgradeable so game/reward logic can evolve.
///      This is the scaffold: storage layout, roles, and lifecycle only. The
///      game functions (commitWord / revealWord / submitResult / streaks) land
///      in follow-up PRs against this same surface.
contract WordleGame is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    // ---------------------------------------------------------------------
    // Roles
    // ---------------------------------------------------------------------

    /// @notice May authorize UUPS upgrades.
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    /// @notice May pause/unpause the game.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    /// @notice Backend role that commits and later reveals the daily word.
    bytes32 public constant WORD_SETTER_ROLE = keccak256("WORD_SETTER_ROLE");
    /// @notice Backend key whose signature attests a player's result (Option B).
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    /// @param guesses  number of guesses used, 1..6 (0 == not played)
    /// @param won      whether the player solved the word
    /// @param hardMode whether hard mode was active
    /// @param at       block timestamp the result was settled
    struct Result {
        uint8 guesses;
        bool won;
        bool hardMode;
        uint40 at;
    }

    /// @param current  current consecutive-day streak
    /// @param max      best streak ever reached
    /// @param lastDay  last day index the player settled a result for
    struct Streak {
        uint32 current;
        uint32 max;
        uint256 lastDay;
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @notice day => keccak256(abi.encodePacked(word, salt)), set by the backend.
    mapping(uint256 => bytes32) public wordCommit;
    /// @notice day => the revealed word, populated only after the day closes.
    mapping(uint256 => string) public revealedWord;
    /// @notice player => day => settled result.
    mapping(address => mapping(uint256 => Result)) public results;
    /// @notice player => streak tracker.
    mapping(address => Streak) public streaks;

    // ---------------------------------------------------------------------
    // Init
    // ---------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the proxy. `admin` receives admin/upgrader/pauser roles.
    /// @dev WORD_SETTER_ROLE and SETTLER_ROLE are granted post-deploy by the admin
    ///      to the backend keys, so they can be rotated independently.
    function initialize(address admin) external initializer {
        require(admin != address(0), "admin=0");

        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Semantic version of the implementation, bumped on each upgrade.
    function version() external pure returns (string memory) {
        return "0.1.0";
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getResult(address player, uint256 day) external view returns (Result memory) {
        return results[player][day];
    }

    function getStreak(address player) external view returns (Streak memory) {
        return streaks[player];
    }

    // ---------------------------------------------------------------------
    // UUPS
    // ---------------------------------------------------------------------

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    { }

    /// @dev Reserved storage slots for future state added in upgrades.
    uint256[45] private __gap;
}
