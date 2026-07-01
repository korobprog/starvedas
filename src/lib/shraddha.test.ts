import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHRADDHA_DECEASED_CHILD_LABEL,
  DEFAULT_SHRADDHA_UNBORN_LABEL,
  formatChildRecordLines,
  getChildUnitsTotal,
  getShraddhaLabels,
  type ChildRecordInput
} from "@/lib/shraddha";

const records: ChildRecordInput[] = [
  { type: "DECEASED", parentName: "Ираида Иванова", childCount: 4 },
  { type: "UNBORN", parentName: "Лидия Лутенко", childCount: 5 },
  { type: "UNBORN", parentName: "Маруся Дубкова", childCount: 3 }
];

describe("formatChildRecordLines", () => {
  it("builds statist lines grouped unborn-first with default labels", () => {
    expect(formatChildRecordLines(records)).toEqual([
      "Нерожденный ребенок Лидия Лутенко 5",
      "Нерожденный ребенок Маруся Дубкова 3",
      "Умерший ребенок Ираида Иванова 4"
    ]);
  });

  it("honours custom labels", () => {
    expect(
      formatChildRecordLines(
        [{ type: "UNBORN", parentName: "Анна Булгар", childCount: 2 }],
        { unbornLabel: "Абортированный ребёнок" }
      )
    ).toEqual(["Абортированный ребёнок Анна Булгар 2"]);
  });

  it("returns nothing for an empty list", () => {
    expect(formatChildRecordLines([])).toEqual([]);
  });
});

describe("getChildUnitsTotal", () => {
  it("sums the child counts across all rows", () => {
    expect(getChildUnitsTotal(records)).toBe(12);
    expect(getChildUnitsTotal([])).toBe(0);
  });
});

describe("getShraddhaLabels", () => {
  it("falls back to defaults for empty values", () => {
    expect(getShraddhaLabels({ unbornLabel: "  " })).toEqual({
      unbornLabel: DEFAULT_SHRADDHA_UNBORN_LABEL,
      deceasedChildLabel: DEFAULT_SHRADDHA_DECEASED_CHILD_LABEL
    });
  });
});
