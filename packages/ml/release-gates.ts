export interface CategoryQualification {
  changeCount: number; contextualCount: number; changeFamilies: number; contextualFamilies: number;
  precision: number; recall: number; coverage: number; highCriticalContextual: number;
  rulePrecision: number; ruleRecall: number; testFamilies: number;
}
/** Shared between developer release preparation and the browser/API runtime. */
export function categoryQualifies(c: CategoryQualification | undefined): boolean {
  if (!c) return false;
  const rates = [c.precision, c.recall, c.coverage, c.rulePrecision, c.ruleRecall];
  const counts = [c.changeCount, c.contextualCount, c.changeFamilies, c.contextualFamilies, c.highCriticalContextual, c.testFamilies];
  if (!rates.every(v => Number.isFinite(v) && v >= 0 && v <= 1) || !counts.every(v => Number.isSafeInteger(v) && v >= 0)) return false;
  return c.testFamilies >= 10 && c.changeCount >= 30 && c.contextualCount >= 30 && c.changeFamilies >= 3 && c.contextualFamilies >= 3
    && c.changeFamilies <= c.changeCount && c.contextualFamilies <= c.contextualCount && c.testFamilies >= Math.max(c.changeFamilies, c.contextualFamilies)
    && c.precision >= .9 && c.recall >= .95 && c.coverage >= .5 && c.highCriticalContextual === 0 && c.precision > c.rulePrecision && c.recall >= c.ruleRecall - .05;
}
