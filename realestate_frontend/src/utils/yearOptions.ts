export interface YearOption {
  id: string;
  value: string;
}

interface GetYearOptionsParams {
  currentYear?: number;
  startYear?: number;
  futureYearLimit?: number;
}

export const getYearOptions = ({
  currentYear = new Date().getFullYear(),
  startYear = Number(import.meta.env.VITE_START_YEAR ?? 1992),
  futureYearLimit = Number(import.meta.env.VITE_FUTURE_YEAR_LIMIT ?? 0),
}: GetYearOptionsParams = {}): YearOption[] => {
  const endYear = currentYear + futureYearLimit;
  const length = Math.max(endYear - startYear + 1, 0);

  return Array.from({ length }, (_, index) => {
    const year = endYear - index;

    return {
      id: String(year),
      value: String(year),
    };
  });
};
