import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Board } from "./Board";

describe("Board", () => {
  it("renders submitted guesses and the current typing row", () => {
    render(
      <Board
        rows={[
          {
            guess: "CRANE",
            marks: ["correct", "absent", "absent", "absent", "absent"],
          },
        ]}
        current="SL"
      />,
    );
    const board = screen.getByLabelText("Wordlelo board");
    expect(board.textContent).toContain("CRANE");
    expect(board.textContent).toContain("SL");
  });

  it("renders an empty board when there are no rows", () => {
    render(<Board rows={[]} current="" />);
    const board = screen.getByLabelText("Wordlelo board");
    expect(board.textContent).toBe("");
  });
});
