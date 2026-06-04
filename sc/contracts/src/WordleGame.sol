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
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title WordleGame
/// @notice On-chain settlement for the Wordlelo daily word game on Celo.
/// @dev Backend-authoritative + commit–reveal: the secret word is never written
///      on-chain until the day closes — only a commitment hash and per-player
///      results live here. UUPS-upgradeable so game/reward logic can evolve.
///      Commit–reveal, attested result submission, and streak tracking are
///      implemented here.
contract WordleGame is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

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
    // Events
    // ---------------------------------------------------------------------

    /// @notice Emitted when the backend commits a day's word hash.
    event WordCommitted(uint256 indexed day, bytes32 commitment);
    /// @notice Emitted when a day's word is revealed after it closes.
    event WordRevealed(uint256 indexed day, string word);
    /// @notice Emitted when a player settles their result for a day.
    event ResultSubmitted(
        address indexed player, uint256 indexed day, uint8 guesses, bool won, bool hardMode
    );

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    /// @notice Commitment hash was zero.
    error EmptyCommitment();
    /// @notice A word was already committed for `day` (commitments are immutable).
    error AlreadyCommitted(uint256 day);
    /// @notice No commitment exists for `day`.
    error NotCommitted(uint256 day);
    /// @notice `day` has already been revealed.
    error AlreadyRevealed(uint256 day);
    /// @notice keccak256(word, salt) did not match the commitment for `day`.
    error RevealMismatch(uint256 day);
    /// @notice Revealed word was empty (the revealed-state sentinel must be non-empty).
    error EmptyWord();
    /// @notice Player already submitted a result for `day`.
    error AlreadySubmitted(uint256 day);
    /// @notice `guesses` was not in the range 1..6.
    error InvalidGuesses(uint8 guesses);
    /// @notice The attestation was not signed by a SETTLER_ROLE key.
    error InvalidAttestation();
    /// @notice `day` was not strictly after the player's last settled day.
    error OutOfOrder(uint256 day, uint256 lastDay);
    /// @notice initialize() was called with a zero admin address.
    error ZeroAdmin();

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
        if (admin == address(0)) revert ZeroAdmin();

        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ---------------------------------------------------------------------
    // Daily word — commit–reveal
    // ---------------------------------------------------------------------

    /// @notice Commit the hash of a day's word before that day opens.
    /// @dev Commitment is `keccak256(abi.encodePacked(word, salt))`. Exactly one
    ///      commit per day — it can never be overwritten, which is what stops the
    ///      backend from swapping the answer mid-day. Reveal timing (only after
    ///      the day closes) is enforced off-chain by the backend.
    /// @param day puzzle-day index (the backend's day scheme)
    /// @param commitment keccak256(abi.encodePacked(word, salt))
    function commitWord(uint256 day, bytes32 commitment) external onlyRole(WORD_SETTER_ROLE) {
        if (commitment == bytes32(0)) revert EmptyCommitment();
        if (wordCommit[day] != bytes32(0)) revert AlreadyCommitted(day);

        wordCommit[day] = commitment;
        emit WordCommitted(day, commitment);
    }

    /// @notice Reveal a day's word after it closes; must match the commitment.
    /// @param day puzzle-day index
    /// @param word the plaintext answer
    /// @param salt the salt used when committing
    function revealWord(uint256 day, string calldata word, bytes32 salt)
        external
        onlyRole(WORD_SETTER_ROLE)
    {
        bytes32 commitment = wordCommit[day];
        if (commitment == bytes32(0)) revert NotCommitted(day);
        if (bytes(revealedWord[day]).length != 0) revert AlreadyRevealed(day);
        if (bytes(word).length == 0) revert EmptyWord();
        if (keccak256(abi.encodePacked(word, salt)) != commitment) revert RevealMismatch(day);

        revealedWord[day] = word;
        emit WordRevealed(day, word);
    }

    // ---------------------------------------------------------------------
    // Player results
    // ---------------------------------------------------------------------

    /// @notice Settle a player's result for a day, authorized by a backend attestation.
    /// @dev Option B: the player sends their OWN tx (so each genuine player is a real
    ///      on-chain DAU). The backend (SETTLER_ROLE) signs an EIP-191 digest over
    ///      keccak256(abi.encodePacked(player, day, guesses, won, hardMode, address(this),
    ///      block.chainid)). Binding address(this) + chainid blocks cross-contract /
    ///      cross-chain replay; one result per (player, day) blocks same-chain replay.
    ///      MiniPay note: this is a wallet-side tx — the frontend must send type "legacy".
    /// @param day puzzle-day index
    /// @param guesses guesses used, 1..6
    /// @param won whether the player solved it
    /// @param hardMode whether hard mode was on
    /// @param sig backend SETTLER signature over the attestation digest
    function submitResult(uint256 day, uint8 guesses, bool won, bool hardMode, bytes calldata sig)
        external
        whenNotPaused
    {
        if (guesses < 1 || guesses > 6) revert InvalidGuesses(guesses);
        if (wordCommit[day] == bytes32(0)) revert NotCommitted(day);
        if (results[msg.sender][day].at != 0) revert AlreadySubmitted(day);

        bytes32 digest = keccak256(
                abi.encodePacked(
                    msg.sender, day, guesses, won, hardMode, address(this), block.chainid
                )
            ).toEthSignedMessageHash();
        if (!hasRole(SETTLER_ROLE, digest.recover(sig))) revert InvalidAttestation();

        results[msg.sender][day] =
            Result({ guesses: guesses, won: won, hardMode: hardMode, at: uint40(block.timestamp) });
        _bumpStreak(msg.sender, day, won);
        emit ResultSubmitted(msg.sender, day, guesses, won, hardMode);
    }

    /// @notice Update a player's streak after a settled result.
    /// @dev Current streak counts consecutive-day wins: a win on the day right after
    ///      the last settled day extends it, any gap (or first play) restarts it at 1,
    ///      and a loss resets it to 0. Submissions must be strictly day-ordered per
    ///      player (day indices are 1-based) so the streak can't be corrupted by
    ///      out-of-order / backfilled results.
    function _bumpStreak(address player, uint256 day, bool won) internal {
        Streak storage s = streaks[player];
        if (day <= s.lastDay) revert OutOfOrder(day, s.lastDay);

        if (won) {
            s.current = (day == s.lastDay + 1) ? s.current + 1 : 1;
            if (s.current > s.max) s.max = s.current;
        } else {
            s.current = 0;
        }
        s.lastDay = day;
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

    /// @notice Whether a day's word has been revealed yet.
    function isRevealed(uint256 day) external view returns (bool) {
        return bytes(revealedWord[day]).length != 0;
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
