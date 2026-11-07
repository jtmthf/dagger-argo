import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./card";

describe("Card", () => {
  it("renders an external link with title and body", () => {
    render(
      <Card title="Docs" href="https://turborepo.dev/docs">
        Find in-depth information.
      </Card>,
    );

    const link = screen.getByRole("link", { name: /Docs/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.getAttribute("href")).toMatch(
      /^https:\/\/turborepo\.dev\/docs\?utm_source=create-turbo/,
    );
    expect(link).toHaveTextContent("Find in-depth information.");
  });
});
