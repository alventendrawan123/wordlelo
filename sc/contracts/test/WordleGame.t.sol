// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { WordleGame } from "../src/WordleGame.sol";

contract WordleGameTest is Test {
    WordleGame internal game;

    address internal admin = makeAddr("admin");
    address internal wordSetter = makeAddr("wordSetter");
    address internal stranger = makeAddr("stranger");
    address internal player = makeAddr("player");
    address internal settler;
    uint256 internal settlerPk;

    uint256 internal constant DAY = 1234;
    string internal constant WORD = "crane";
    bytes32 internal constant SALT = keccak256("pepper");

    function setUp() public {
        WordleGame impl = new WordleGame();
        bytes memory initData = abi.encodeCall(WordleGame.initialize, (admin));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        game = WordleGame(address(proxy));

        // Backend word-setter key (granted post-deploy by the admin).
        // Cache the role read first — vm.prank only affects the next external call.
        bytes32 wordSetterRole = game.WORD_SETTER_ROLE();
        vm.prank(admin);
        game.grantRole(wordSetterRole, wordSetter);

        // Backend settler key that attests player results (Option B).
        (settler, settlerPk) = makeAddrAndKey("settler");
        bytes32 settlerRole = game.SETTLER_ROLE();
        vm.prank(admin);
        game.grantRole(settlerRole, settler);
    }

    function _commitment(string memory word, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(word, salt));
    }

    function _commitDay(uint256 day) internal {
        vm.prank(wordSetter);
        game.commitWord(day, _commitment(WORD, SALT));
    }

    /// @dev Build a SETTLER attestation signature matching the contract's digest.
    function _attest(uint256 pk, address who, uint256 day, uint8 guesses, bool won, bool hardMode)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(
            keccak256(
                abi.encodePacked(who, day, guesses, won, hardMode, address(game), block.chainid)
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    // -----------------------------------------------------------------
    // Init / lifecycle
    // -----------------------------------------------------------------

    function test_GrantsAdminRolesOnInit() public view {
        assertTrue(game.hasRole(game.DEFAULT_ADMIN_ROLE(), admin), "admin role");
        assertTrue(game.hasRole(game.UPGRADER_ROLE(), admin), "upgrader role");
        assertTrue(game.hasRole(game.PAUSER_ROLE(), admin), "pauser role");
    }

    function test_BackendRolesUnsetForAdmin() public view {
        // SETTLER is granted later; WORD_SETTER was granted to wordSetter, not admin.
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

    // -----------------------------------------------------------------
    // commitWord
    // -----------------------------------------------------------------

    function test_CommitWord() public {
        bytes32 c = _commitment(WORD, SALT);

        vm.expectEmit(true, false, false, true, address(game));
        emit WordleGame.WordCommitted(DAY, c);

        vm.prank(wordSetter);
        game.commitWord(DAY, c);

        assertEq(game.wordCommit(DAY), c);
        assertFalse(game.isRevealed(DAY));
    }

    function test_CommitWord_RevertEmptyCommitment() public {
        vm.prank(wordSetter);
        vm.expectRevert(WordleGame.EmptyCommitment.selector);
        game.commitWord(DAY, bytes32(0));
    }

    function test_CommitWord_RevertDoubleCommit() public {
        vm.prank(wordSetter);
        game.commitWord(DAY, _commitment(WORD, SALT));

        vm.prank(wordSetter);
        vm.expectRevert(abi.encodeWithSelector(WordleGame.AlreadyCommitted.selector, DAY));
        game.commitWord(DAY, _commitment("other", SALT));
    }

    function test_CommitWord_RevertNonSetter() public {
        vm.prank(stranger);
        vm.expectRevert();
        game.commitWord(DAY, _commitment(WORD, SALT));
    }

    // -----------------------------------------------------------------
    // revealWord
    // -----------------------------------------------------------------

    function test_RevealWord() public {
        vm.prank(wordSetter);
        game.commitWord(DAY, _commitment(WORD, SALT));

        vm.expectEmit(true, false, false, true, address(game));
        emit WordleGame.WordRevealed(DAY, WORD);

        vm.prank(wordSetter);
        game.revealWord(DAY, WORD, SALT);

        assertEq(game.revealedWord(DAY), WORD);
        assertTrue(game.isRevealed(DAY));
    }

    function test_RevealWord_RevertNotCommitted() public {
        vm.prank(wordSetter);
        vm.expectRevert(abi.encodeWithSelector(WordleGame.NotCommitted.selector, DAY));
        game.revealWord(DAY, WORD, SALT);
    }

    function test_RevealWord_RevertMismatchWord() public {
        vm.prank(wordSetter);
        game.commitWord(DAY, _commitment(WORD, SALT));

        vm.prank(wordSetter);
        vm.expectRevert(abi.encodeWithSelector(WordleGame.RevealMismatch.selector, DAY));
        game.revealWord(DAY, "wrong", SALT);
    }

    function test_RevealWord_RevertMismatchSalt() public {
        vm.prank(wordSetter);
        game.commitWord(DAY, _commitment(WORD, SALT));

        vm.prank(wordSetter);
        vm.expectRevert(abi.encodeWithSelector(WordleGame.RevealMismatch.selector, DAY));
        game.revealWord(DAY, WORD, keccak256("wrong-salt"));
    }

    function test_RevealWord_RevertDoubleReveal() public {
        vm.startPrank(wordSetter);
        game.commitWord(DAY, _commitment(WORD, SALT));
        game.revealWord(DAY, WORD, SALT);

        vm.expectRevert(abi.encodeWithSelector(WordleGame.AlreadyRevealed.selector, DAY));
        game.revealWord(DAY, WORD, SALT);
        vm.stopPrank();
    }

    function test_RevealWord_RevertNonSetter() public {
        vm.prank(wordSetter);
        game.commitWord(DAY, _commitment(WORD, SALT));

        vm.prank(stranger);
        vm.expectRevert();
        game.revealWord(DAY, WORD, SALT);
    }

    function test_RevealWord_RevertEmptyWord() public {
        vm.startPrank(wordSetter);
        game.commitWord(DAY, _commitment("", SALT));

        vm.expectRevert(WordleGame.EmptyWord.selector);
        game.revealWord(DAY, "", SALT);
        vm.stopPrank();

        assertFalse(game.isRevealed(DAY));
    }

    // -----------------------------------------------------------------
    // submitResult (attested, Option B)
    // -----------------------------------------------------------------

    function test_SubmitResult() public {
        _commitDay(DAY);
        bytes memory sig = _attest(settlerPk, player, DAY, 3, true, false);

        vm.expectEmit(true, true, false, true, address(game));
        emit WordleGame.ResultSubmitted(player, DAY, 3, true, false);

        vm.prank(player);
        game.submitResult(DAY, 3, true, false, sig);

        WordleGame.Result memory r = game.getResult(player, DAY);
        assertEq(r.guesses, 3);
        assertTrue(r.won);
        assertFalse(r.hardMode);
        assertEq(r.at, uint40(block.timestamp));
    }

    function test_SubmitResult_RevertBadGuessesZero() public {
        _commitDay(DAY);
        bytes memory sig = _attest(settlerPk, player, DAY, 0, false, false);
        vm.prank(player);
        vm.expectRevert(abi.encodeWithSelector(WordleGame.InvalidGuesses.selector, uint8(0)));
        game.submitResult(DAY, 0, false, false, sig);
    }

    function test_SubmitResult_RevertBadGuessesSeven() public {
        _commitDay(DAY);
        bytes memory sig = _attest(settlerPk, player, DAY, 7, true, false);
        vm.prank(player);
        vm.expectRevert(abi.encodeWithSelector(WordleGame.InvalidGuesses.selector, uint8(7)));
        game.submitResult(DAY, 7, true, false, sig);
    }

    function test_SubmitResult_RevertNotCommitted() public {
        bytes memory sig = _attest(settlerPk, player, DAY, 3, true, false);
        vm.prank(player);
        vm.expectRevert(abi.encodeWithSelector(WordleGame.NotCommitted.selector, DAY));
        game.submitResult(DAY, 3, true, false, sig);
    }

    function test_SubmitResult_RevertDoubleSubmit() public {
        _commitDay(DAY);
        bytes memory sig = _attest(settlerPk, player, DAY, 3, true, false);
        vm.prank(player);
        game.submitResult(DAY, 3, true, false, sig);

        vm.prank(player);
        vm.expectRevert(abi.encodeWithSelector(WordleGame.AlreadySubmitted.selector, DAY));
        game.submitResult(DAY, 3, true, false, sig);
    }

    function test_SubmitResult_RevertForgedSig() public {
        _commitDay(DAY);
        (, uint256 attackerPk) = makeAddrAndKey("attacker");
        bytes memory sig = _attest(attackerPk, player, DAY, 1, true, false);
        vm.prank(player);
        vm.expectRevert(WordleGame.InvalidAttestation.selector);
        game.submitResult(DAY, 1, true, false, sig);
    }

    function test_SubmitResult_RevertWrongPlayer() public {
        _commitDay(DAY);
        // settler signs an attestation for `player`, but `stranger` tries to use it.
        bytes memory sig = _attest(settlerPk, player, DAY, 3, true, false);
        vm.prank(stranger);
        vm.expectRevert(WordleGame.InvalidAttestation.selector);
        game.submitResult(DAY, 3, true, false, sig);
    }

    function test_SubmitResult_RevertTamperedFields() public {
        _commitDay(DAY);
        // sig is over guesses=3, but the player submits guesses=1.
        bytes memory sig = _attest(settlerPk, player, DAY, 3, true, false);
        vm.prank(player);
        vm.expectRevert(WordleGame.InvalidAttestation.selector);
        game.submitResult(DAY, 1, true, false, sig);
    }

    function test_SubmitResult_RevertReplayDifferentDay() public {
        _commitDay(DAY);
        _commitDay(DAY + 1);
        bytes memory sig = _attest(settlerPk, player, DAY, 3, true, false);
        vm.prank(player);
        vm.expectRevert(WordleGame.InvalidAttestation.selector);
        game.submitResult(DAY + 1, 3, true, false, sig);
    }

    function test_SubmitResult_RevertWhenPaused() public {
        _commitDay(DAY);
        vm.prank(admin);
        game.pause();

        bytes memory sig = _attest(settlerPk, player, DAY, 3, true, false);
        vm.prank(player);
        vm.expectRevert(); // EnforcedPause
        game.submitResult(DAY, 3, true, false, sig);
    }

    function testFuzz_SubmitResult(uint8 guesses, bool won, bool hardMode) public {
        guesses = uint8(bound(uint256(guesses), 1, 6));
        _commitDay(DAY);
        bytes memory sig = _attest(settlerPk, player, DAY, guesses, won, hardMode);

        vm.prank(player);
        game.submitResult(DAY, guesses, won, hardMode, sig);

        WordleGame.Result memory r = game.getResult(player, DAY);
        assertEq(r.guesses, guesses);
        assertEq(r.won, won);
        assertEq(r.hardMode, hardMode);
    }

    // -----------------------------------------------------------------
    // fuzz
    // -----------------------------------------------------------------

    function testFuzz_CommitRevealRoundtrip(string calldata word, bytes32 salt, uint256 day)
        public
    {
        vm.assume(bytes(word).length != 0); // empty words are rejected by revealWord
        bytes32 c = keccak256(abi.encodePacked(word, salt));
        vm.assume(c != bytes32(0));

        vm.startPrank(wordSetter);
        game.commitWord(day, c);
        game.revealWord(day, word, salt);
        vm.stopPrank();

        assertEq(game.revealedWord(day), word);
        assertTrue(game.isRevealed(day));
    }
}
