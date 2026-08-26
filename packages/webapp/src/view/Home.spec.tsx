import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Home } from "./Home.tsx";

describe("Home", () => {
  it("should render heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "hello" })).toBeDefined();
  });
});
