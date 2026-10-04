import { describe, expect, it } from "vitest";

import { courseModulesSchema } from "@/lib/validation/lms";
import {
  moduleLabels,
  moduleLabelsFor,
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