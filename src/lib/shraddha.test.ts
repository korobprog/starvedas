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
      ...Array.from(
        { length: records[1].childCount },
        (_, index) =>
          `${DEFAULT_SHRADDHA_UNBORN_LABEL} ${records[1].parentName} ${
            index + 1
          }`
      ),
      ...Array.from(
        { length: records[2].childCount },
        (_, index) =>
          `${DEFAULT_SHRADDHA_UNBORN_LABEL} ${records[2].parentName} ${
            index + 1
          }`
      ),
      ...Array.from(
        { length: records[0].childCount },
        (_, index) =>
          `${DEFAULT_SHRADDHA_DECEASED_CHILD_LABEL} ${
            records[0].parentName
          } ${index + 1}`
      )
    ]);
  });

  it("honours custom labels", () => {
    const unbornLabel = "Абортированный ребёнок";
    const childRecord = {
      childCount: 2,
      parentName: "Анна Булгар",
      type: "UNBORN" as const
    };

    expect(formatChildRecordLines([childRecord], { unbornLabel })).toEqual([
      `${unbornLabel} ${childRecord.parentName} 1`,
      `${unbornLabel} ${childRecord.parentName} 2`
    ]);
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
