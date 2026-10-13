import { renderHook, waitFor } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePhotoUrl } from "../src/components/usePhotoUrl.ts";
import { loadPhotoBlob } from "../src/lib/photos.ts";

vi.mock("../src/lib/photos.ts", () => ({
  loadPhotoBlob: vi.fn(() => Promise.reject(new Error("photo store blocked"))),
}));

describe("usePhotoUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:draft", revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to no photo when loading the stored blob fails", async () => {
    const { result, rerender } = renderHook<
      string | null,
      { photoId?: string; photoFile?: File | null }
    >(({ photoId, photoFile }) => usePhotoUrl(photoId, photoFile), {
      initialProps: { photoFile: new File(["draft"], "draft.png") },
    });
    await waitFor(() => expect(result.current).toBe("blob:draft"));

    rerender({ photoId: "broken", photoFile: null });

    await waitFor(() => expect(loadPhotoBlob).toHaveBeenCalledWith("broken"));
    await waitFor(() => expect(result.current).toBeNull());
  });
});
