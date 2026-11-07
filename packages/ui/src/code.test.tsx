import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Code } from "./code";

describe("Code", () => {
  it("renders children inside a <code> element", () => {
    const { container } = render(<Code className="mono">pnpm test</Code>);

    const code = container.querySelector("code");
    expect(code).toHaveTextContent("pnpm test");
    expect(code).toHaveClass("mono");
  });
});
