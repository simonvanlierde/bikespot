import { render } from "@testing-library/preact";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import App from "../src/App";

describe("accessibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the main view with no axe violations", async () => {
    const { container } = render(<App />);

    const results = await axe(container);

    // Assert on violations directly so the failure message lists offending rules,
    // without depending on vitest-axe's custom matcher type augmentation.
    expect(results.violations).toEqual([]);
  });
});
