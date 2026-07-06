import { fireEvent, render } from "@testing-library/preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SheetDialog } from "../src/components/SheetDialog.tsx";

function renderSheet(onClose = vi.fn()) {
  const result = render(
    <SheetDialog label="Test sheet" title="Test" onClose={onClose}>
      <button type="button">First</button>
      <button type="button">Last</button>
    </SheetDialog>,
  );
  return { ...result, onClose };
}

describe("SheetDialog focus trap", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  it("locks body scroll while open and restores it on unmount", () => {
    const { unmount } = renderSheet();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on Escape", () => {
    const { onClose } = renderSheet();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  // The header Close button is the first focusable element in the sheet; the
  // "Last" child button is the last.
  it("wraps Tab from the last element back to the first", () => {
    const { getByText, getByLabelText } = renderSheet();
    getByText("Last").focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(getByLabelText("Close"));
  });

  it("wraps Shift+Tab from the first element to the last", () => {
    const { getByText, getByLabelText } = renderSheet();
    getByLabelText("Close").focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(getByText("Last"));
  });

  it("pulls focus back inside when it has escaped the sheet", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    const { getByLabelText } = renderSheet();
    outside.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(getByLabelText("Close"));
    outside.remove();
  });
});
