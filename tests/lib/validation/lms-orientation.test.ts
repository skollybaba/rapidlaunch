import { describe, expect, it } from "vitest";

import { courseModulesSchema } from "@/lib/validation/lms";
import {
  moduleLabels,
  moduleLabelsFor,
  resolveHighlightedFlags,
  resolveHighlightedIndex,
  resolveOrientationFlags,
} from "@/types/lms";

function module(id: string, isOrientation?: boolean) {
  return { id, title: id, lessons: [], isOrientation };
}

describe("resolveOrientationFlags", () => {
  it("treats an undecided first module as orientation", () => {
    expect(resolveOrientationFlags([module("a"), module("b")])).toEqual([
      true,
      false,
    ]);
  });

  it("respects an explicit opt-out on the first module", () => {
    expect(
      resolveOrientationFlags([module("a", false), module("b")])
    ).toEqual([false, false]);
  });

  it("never lets a later module claim orientation", () => {
    expect(
      resolveOrientationFlags([module("a"), module("b", true), module("c", true)])
    ).toEqual([true, false, false]);
  });

  it("returns an empty list for an empty curriculum", () => {
    expect(resolveOrientationFlags([])).toEqual([]);
  });
});

describe("moduleLabelsFor", () => {
  it("numbers course modules from 1 when orientation is on", () => {
    expect(moduleLabelsFor([true, false, false, false])).toEqual([
      "Orientation",
      "Module 1",
      "Module 2",
      "Module 3",
    ]);
  });

  it("numbers from 1 when orientation is off", () => {
    expect(moduleLabelsFor([false, false, false])).toEqual([
      "Module 1",
      "Module 2",
      "Module 3",
    ]);
  });

  it("gives the orientation module no number when it is the only module", () => {
    expect(moduleLabelsFor([true])).toEqual(["Orientation"]);
  });

  it("resolves labels straight from stored modules", () => {
    expect(moduleLabels([module("a"), module("b"), module("c")])).toEqual([
      "Orientation",
      "Module 1",
      "Module 2",
    ]);
    expect(moduleLabels([module("a", false), module("b")])).toEqual([
      "Module 1",
      "Module 2",
    ]);
  });
});

describe("resolveHighlightedFlags", () => {
  function highlighted(id: string, isHighlighted?: boolean, isOrientation?: boolean) {
    return { id, title: id, lessons: [], isOrientation, isHighlighted };
  }

  it("marks only the flagged module", () => {
    expect(
      resolveHighlightedFlags([
        highlighted("a"),
        highlighted("b", true),
        highlighted("c"),
      ])
    ).toEqual([false, true, false]);
  });

  it("ignores a second highlighted module so the player shows one card", () => {
    expect(
      resolveHighlightedFlags([highlighted("a"), highlighted("b", true), highlighted("c", true)])
    ).toEqual([false, true, false]);
  });

  it("never highlights the orientation module", () => {
    expect(
      resolveHighlightedFlags([highlighted("a", true), highlighted("b", true)])
    ).toEqual([false, true]);
  });

  it("returns all false when nothing is highlighted", () => {
    expect(
      resolveHighlightedFlags([highlighted("a"), highlighted("b")])
    ).toEqual([false, false]);
  });

  it("reports the highlighted position", () => {
    expect(
      resolveHighlightedIndex([highlighted("a"), highlighted("b", true)])
    ).toBe(1);
    expect(resolveHighlightedIndex([highlighted("a")])).toBe(-1);
  });
});

describe("moduleLabelsFor with a highlighted module", () => {
  it("labels the highlighted module and keeps the numbering contiguous", () => {
    expect(
      moduleLabelsFor([true, false, false, false], [false, false, true, false])
    ).toEqual(["Orientation", "Module 1", "Highlighted", "Module 2"]);
  });

  it("resolves the label straight from stored modules", () => {
    expect(
      moduleLabels([
        { isOrientation: false },
        { isHighlighted: true },
        {},
      ])
    ).toEqual(["Module 1", "Highlighted", "Module 2"]);
  });
});

describe("courseModulesSchema with isHighlighted", () => {
  it("accepts a single highlighted module", () => {
    const parsed = courseModulesSchema.parse([
      { id: "a", title: "Orientation", lessons: [] },
      { id: "b", title: "Standalone", lessons: [], isHighlighted: true },
    ]);
    expect(parsed[1].isHighlighted).toBe(true);
  });

  it("rejects more than one highlighted module", () => {
    const result = courseModulesSchema.safeParse([
      { id: "a", title: "Orientation", lessons: [], isOrientation: false },
      { id: "b", title: "One", lessons: [], isHighlighted: true },
      { id: "c", title: "Two", lessons: [], isHighlighted: true },
    ]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/one module can be highlighted/i);
  });

  it("rejects highlighting the orientation module", () => {
    const result = courseModulesSchema.safeParse([
      { id: "a", title: "Orientation", lessons: [], isHighlighted: true },
      { id: "b", title: "Basics", lessons: [] },
    ]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/orientation module cannot/i);
  });

  it("allows highlighting module 1 when orientation is turned off", () => {
    const result = courseModulesSchema.safeParse([
      { id: "a", title: "Standalone", lessons: [], isOrientation: false, isHighlighted: true },
    ]);
    expect(result.success).toBe(true);
  });
});

describe("courseModulesSchema with isOrientation", () => {
  it("accepts the orientation flag", () => {
    const parsed = courseModulesSchema.parse([
      { id: "a", title: "Orientation", lessons: [], isOrientation: true },
      { id: "b", title: "Basics", lessons: [] },
    ]);
    expect(parsed[0].isOrientation).toBe(true);
    expect(parsed[1].isOrientation).toBeUndefined();
  });

  it("rejects a non-boolean orientation flag", () => {
    const result = courseModulesSchema.safeParse([
      { id: "a", title: "Orientation", lessons: [], isOrientation: "yes" },
    ]);
    expect(result.success).toBe(false);
  });
});