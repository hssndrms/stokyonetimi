

export const findById = <T extends { id: string },>(arr: T[], id: string | null | undefined): T | undefined => {
    if (id === null || id === undefined) {
        return undefined;
    }
    return arr.find(item => item.id === id);
};

export const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) {
    return (0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return (0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return num.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
