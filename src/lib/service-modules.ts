export const serviceModuleKeys = ["pitri-paksha"] as const;

export type ServiceModuleKey = (typeof serviceModuleKeys)[number];

export const serviceModuleOptions: Array<{
  key: ServiceModuleKey;
  title: string;
}> = [{ key: "pitri-paksha", title: "Питри Пакша" }];

export function getServiceModuleTitle(
  moduleKey: string | null | undefined
): string | null {
  if (!moduleKey) {
    return null;
  }

  return (
    serviceModuleOptions.find((option) => option.key === moduleKey)?.title ??
    moduleKey
  );
}

/**
 * Продукт без модуля виден всегда. Продукт модуля — только когда модуль включён,
 * то есть его ключа нет в списке скрытых.
 */
export function isServiceModuleVisible(
  moduleKey: string | null | undefined,
  hiddenModuleKeys: readonly string[]
): boolean {
  if (!moduleKey) {
    return true;
  }

  return !hiddenModuleKeys.includes(moduleKey);
}
