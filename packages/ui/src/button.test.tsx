import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button appName="web">Click me</Button>);

    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("alerts with the app name when clicked", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<Button appName="docs">Click me</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Click me" }));

    expect(alert).toHaveBeenCalledWith("Hello from your docs app!");
  });
});
