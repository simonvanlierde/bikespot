import { render, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { useState } from "preact/hooks";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "../src/components/SegmentedControl.tsx";

const OPTIONS = ["a", "b", "c"] as const;
type Option = (typeof OPTIONS)[number];

function Harness({ onChange }: { onChange: (value: Option) => void }) {
  const [value, setValue] = useState<Option>("a");
  return (
    <SegmentedControl
      label="Pick"
      options={OPTIONS}
      value={value}
      titleCase={(option) => option.toUpperCase()}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

const segment = (name: string) => screen.getByRole("button", { name: `Pick ${name}` });

describe("SegmentedControl keyboard", () => {
  it("moves the selection and focus with the arrow keys", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    segment("A").focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("b");
    expect(segment("B")).toHaveFocus();
    expect(segment("B")).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith("c");
    expect(segment("C")).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenLastCalledWith("b");
    expect(segment("B")).toHaveFocus();
  });

  it("wraps around at both ends", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    segment("A").focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("c");
    expect(segment("C")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("a");
    expect(segment("A")).toHaveFocus();
  });

  it("leaves other keys alone", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    segment("A").focus();
    await user.keyboard("x{Home}");

    expect(onChange).not.toHaveBeenCalled();
    expect(segment("A")).toHaveFocus();
  });
});
