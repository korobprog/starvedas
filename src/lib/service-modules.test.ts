import { describe, expect, it } from "vitest";
import {
  getServiceModuleTitle,
  isServiceModuleVisible
} from "@/lib/service-modules";

describe("isServiceModuleVisible", () => {
  it("показывает обычные продукты всегда", () => {
    expect(isServiceModuleVisible(null, ["pitri-paksha"])).toBe(true);
    expect(isServiceModuleVisible(undefined, ["pitri-paksha"])).toBe(true);
  });

  it("скрывает продукт выключенного модуля", () => {
    expect(isServiceModuleVisible("pitri-paksha", ["pitri-paksha"])).toBe(
      false
    );
  });

  it("показывает продукт включённого модуля", () => {
    expect(isServiceModuleVisible("pitri-paksha", [])).toBe(true);
  });
});

describe("getServiceModuleTitle", () => {
  it("возвращает название известного модуля", () => {
    expect(getServiceModuleTitle("pitri-paksha")).toBe("Питри Пакша");
  });

  it("возвращает null без модуля", () => {
    expect(getServiceModuleTitle(null)).toBeNull();
  });

  it("возвращает сам ключ для неизвестного модуля", () => {
    expect(getServiceModuleTitle("unknown")).toBe("unknown");
  });
});
