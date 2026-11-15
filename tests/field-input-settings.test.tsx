import { render, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { useState } from "preact/hooks";
import { describe, expect, it } from "vitest";

import { FieldInputSettings } from "../src/features/location/FieldInputSettings.tsx";

function Harness({ initial }: { initial: string[] }) {
  const [labels, setLabels] = useState(initial);
  return (
    <FieldInputSettings
      field="lane"
      noun="lane"
      legend="Lane input"
      mode="quick"
      labels={labels}
      onModeChange={() => {}}
      onLabelsChange={setLabels}
    />
  );
}

const remove = (n: number) => screen.getByRole("button", { name: `Remove lane ${n}` });

describe("preset label removal", () => {
  it("moves focus to the next remove button when a middle row goes", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["1", "2", "3"]} />);

    await user.click(remove(2));

    expect(screen.queryByRole("textbox", { name: /lane 3/i })).toBeNull();
    expect(remove(2)).toHaveFocus();
  });

  it("moves focus to the previous remove button when the last row goes", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["1", "2", "3"]} />);

    await user.click(remove(3));

    expect(remove(2)).toHaveFocus();
  });

  it("falls back to the add button when one row is left", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["1", "2"]} />);

    await user.click(remove(1));

    expect(screen.queryByRole("button", { name: /^Remove lane/ })).toBeNull();
    expect(screen.getByRole("button", { name: /add/i })).toHaveFocus();
  });
});
