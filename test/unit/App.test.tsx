import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../src/app/App";

describe("App shell", () => {
  it("renders primary navigation landmarks", () => {
    render(<App />);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Status" })).toBeInTheDocument();
  });
});
