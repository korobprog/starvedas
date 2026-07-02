export type ChildRecordType = "UNBORN" | "DECEASED";

export type ChildRecordInput = {
  type: ChildRecordType;
  parentName: string;
  childCount: number;
};

export type ShraddhaLabels = {
  unbornLabel: string;
  deceasedChildLabel: string;
};

export const DEFAULT_SHRADDHA_WARNING_TEXT =
  "ТОЛЬКО ДЛЯ УСОПШИХ, ИМЕНА ЖИВЫХ ПИСАТЬ НЕЛЬЗЯ";

export const DEFAULT_SHRADDHA_UNBORN_LABEL = "Нерожденный ребенок";

export const DEFAULT_SHRADDHA_DECEASED_CHILD_LABEL = "Умерший ребенок";

export const DEFAULT_SHRADDHA_CHILD_HELP_TEXT =
  "Ниже указываем только имя и фамилию родителя в родительном падеже - пример: Ивановой Иры";

export const CHILD_RECORD_MIN_COUNT = 1;
export const CHILD_RECORD_MAX_COUNT = 99;
export const CHILD_RECORDS_MAX_ROWS = 100;

// Порядок групп в списке для статиста: сначала нерожденные, потом умершие.
const CHILD_TYPE_ORDER: ChildRecordType[] = ["UNBORN", "DECEASED"];

export function getShraddhaLabels(
  labels?: Partial<ShraddhaLabels> | null
): ShraddhaLabels {
  return {
    unbornLabel: labels?.unbornLabel?.trim() || DEFAULT_SHRADDHA_UNBORN_LABEL,
    deceasedChildLabel:
      labels?.deceasedChildLabel?.trim() ||
      DEFAULT_SHRADDHA_DECEASED_CHILD_LABEL
  };
}

function getLabelForType(type: ChildRecordType, labels: ShraddhaLabels) {
  return type === "UNBORN" ? labels.unbornLabel : labels.deceasedChildLabel;
}

/**
 * Превращает записи о детях в строки для статиста, например:
 *   "Нерожденный ребенок Лидии Лутенко 5"
 *   "Умерший ребенок Ираиды Ивановой 4"
 * Группирует по типу (сначала нерожденные, затем умершие), сохраняя порядок ввода
 * внутри группы.
 */
export function formatChildRecordLines(
  records: ReadonlyArray<ChildRecordInput>,
  labels?: Partial<ShraddhaLabels> | null
): string[] {
  const resolvedLabels = getShraddhaLabels(labels);

  return CHILD_TYPE_ORDER.flatMap((type) =>
    records
      .filter((record) => record.type === type)
      .map(
        (record) =>
          `${getLabelForType(type, resolvedLabels)} ${record.parentName} ${
            record.childCount
          }`
      )
  );
}

/**
 * Сумма всех детей во всех строках — используется как дополнительные
 * оплачиваемые единицы (дети влияют на цену/количество).
 */
export function getChildUnitsTotal(
  records: ReadonlyArray<ChildRecordInput>
): number {
  return records.reduce((sum, record) => sum + record.childCount, 0);
}
