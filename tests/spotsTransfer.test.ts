import type { TargetedEvent } from "preact";
import { beforeEach, describe, expect, it } from "vitest";
import type { LocationRecord } from "../src/lib/app-data.ts";
import { createLocationRecord } from "../src/lib/domain.ts";
import { exportSpots, mergeSpots, parseSpotsFile } from "../src/lib/spotsTransfer.ts";
import { data, handleImportSpots, notice } from "../src/lib/store.ts";
import { sampleAppData } from "./fixtures.ts";

// The fixture always has a current spot and one recent spot.
const current = sampleAppData.current as LocationRecord;
const previous = sampleAppData.recent[0] as LocationRecord;

function outsideSpot(updatedAt: string): LocationRecord {
  return createLocationRecord({ mode: "outside", stationName: "" }, updatedAt);
}

function fileEvent(text: string): TargetedEvent<HTMLInputElement> {
  const input = document.createElement("input");
  input.type = "file";
  Object.defineProperty(input, "files", {
    value: [new File([text], "spots.json", { type: "application/json" })],
  });
  return { currentTarget: input } as unknown as TargetedEvent<HTMLInputElement>;
}

describe("spots transfer", () => {
  it("round-trips current and recent spots without photo ids", () => {
    const withPhoto = {
      ...sampleAppData,
      current: { ...current, photoId: "photo-1" },
    };
    const file = exportSpots(withPhoto);

    expect(JSON.parse(file).version).toBe(1);
    const spots = parseSpotsFile(file);
    expect(spots?.map((entry) => entry.id)).toEqual([
      sampleAppData.current?.id,
      sampleAppData.recent[0]?.id,
    ]);
    expect(spots?.[0]?.photoId).toBeUndefined();
  });

  it.each([
    ["not JSON", "{"],
    ["no version", JSON.stringify({ spots: [] })],
    ["another version", JSON.stringify({ version: 2, spots: [] })],
    ["spots not a list", JSON.stringify({ version: 1, spots: {} })],
    ["an invalid spot", JSON.stringify({ version: 1, spots: [{ id: "x" }] })],
    ["a bare list", JSON.stringify([])],
  ])("rejects %s", (_label, text) => {
    expect(parseSpotsFile(text)).toBeNull();
  });

  it("merges by id, newest first, and counts only new spots", () => {
    const fresh = outsideSpot("2026-04-19T09:00:00.000Z");
    const spots = [current, previous, fresh, fresh];

    const result = mergeSpots(sampleAppData, spots);

    expect(result.added).toBe(1);
    expect(result.data.current).toBe(sampleAppData.current);
    expect(result.data.recent.map((entry) => entry.id)).toEqual([
      fresh.id,
      sampleAppData.recent[0]?.id,
    ]);
  });

  it("leaves data untouched when nothing is new", () => {
    const result = mergeSpots(sampleAppData, [previous]);

    expect(result).toEqual({ data: sampleAppData, added: 0 });
  });

  it("keeps Recent within its cap and counts only the spots that fit", () => {
    const older = Array.from({ length: 6 }, (_, i) =>
      outsideSpot(`2026-01-0${i + 1}T00:00:00.000Z`),
    );

    const result = mergeSpots(sampleAppData, older);

    expect(result.data.recent).toHaveLength(5);
    expect(result.added).toBe(4);
  });
});

describe("handleImportSpots", () => {
  beforeEach(() => {
    data.value = sampleAppData;
    notice.value = null;
  });

  it("adds the file's new spots and says how many", async () => {
    const fresh = outsideSpot("2026-04-19T09:00:00.000Z");

    await handleImportSpots(fileEvent(JSON.stringify({ version: 1, spots: [fresh] })));

    expect(data.value.recent[0]?.id).toBe(fresh.id);
    expect(notice.value).toEqual({ text: "1 spot added" });
  });

  it("shows an error and changes nothing for a bad file", async () => {
    await handleImportSpots(fileEvent(JSON.stringify({ version: 2, spots: [] })));

    expect(data.value).toBe(sampleAppData);
    expect(notice.value?.tone).toBe("error");
  });
});
