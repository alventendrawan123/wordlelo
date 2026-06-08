import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { mockUseLeaderboard } = vi.hoisted(() => ({
  mockUseLeaderboard: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined }),
}));

vi.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: mockUseLeaderboard,
}));

import { LeaderboardPage } from "./LeaderboardPage";

describe("LeaderboardPage", () => {
  it("renders the ranking with truncated addresses", () => {
    mockUseLeaderboard.mockReturnValue({
      leaderboard: [
        {
          player: "0x1234567890abcdef1234567890abcdef12345678",
          played: 5,
          wins: 4,
        },
      ],
      results: [],
      loading: false,
      error: false,
    });

    render(<LeaderboardPage />);

    expect(screen.getByRole("heading", { name: "Leaderboard" })).toBeTruthy();
    expect(screen.getByText("0x1234…5678")).toBeTruthy();
  });

  it("shows an empty state when there are no results", () => {
    mockUseLeaderboard.mockReturnValue({
      leaderboard: [],
      results: [],
      loading: false,
      error: false,
    });

    render(<LeaderboardPage />);

    expect(screen.getByText(/No results yet/)).toBeTruthy();
  });
});
