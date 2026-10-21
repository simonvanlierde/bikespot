import { render } from "@testing-library/preact";
import { describe, expect, it } from "vitest";

import { PhotoField } from "../src/components/PhotoField.tsx";

describe("PhotoField", () => {
  // Chrome on Android opens its photo picker, which has no camera, for a file input without
  // `capture`; the camera needs an input of its own.
  it("offers the camera and the gallery as separate inputs", () => {
    const { container } = render(
      <PhotoField photoFile={null} metadataKept={false} onPhotoChange={() => {}} onPhotoRemove={() => {}} />,
    );
    const inputs = [...container.querySelectorAll<HTMLInputElement>("input[type=file]")];

    expect(inputs.map((input) => input.getAttribute("capture"))).toEqual(["environment", null]);
    expect(inputs.every((input) => input.accept === "image/*")).toBe(true);
  });
});
