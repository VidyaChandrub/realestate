export const toArray = (val: any) => {
  if (!val) return undefined;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.includes(',')) return val.split(',');
  return [val];
};