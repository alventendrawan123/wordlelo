import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Keyboard } from "./Keyboard";

describe("Keyboard", () => {
  it("calls onKey with the pressed key", () => {
    const onKey = vi.fn();
    render(<Keyboard keyStates={{}} onKey={onKey} />);

    fireEvent.click(screen.getByRole("button", { name: "Q" }));
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    expect(onKey).toHaveBeenNthCalledWith(1, "Q");
    expect(onKey).toHaveBeenNthCalledWith(2, "Enter");
  });

  it("colors a key by its status", () => {
    render(<Keyboard keyStates={{ Q: "correct" }} onKey={() => undefined} />);
    expect(screen.getByRole("button", { name: "Q" }).className).toContain(
      "bg-correct",
    );
  });
});
