import { render, screen } from "@testing-library/preact";
import { describe, expect, it } from "vitest";

import App from "../src/App.tsx";
import { createStore } from "../src/lib/store.ts";

describe("runtime smoke", () => {
  it("mounts the app shell", () => {
    render(<App store={createStore()} />);

    expect(screen.getByRole("region", { name: /current spot/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /more/i })).toBeInTheDocument();
  });
});
