export const cartInitialState = {
  items: [],
  count: 0,
  total: 0,
};

export function getCartTotals(items = []) {
  return items.reduce(
    (totals, item) => ({
      count: totals.count + Number(item.quantity || 0),
      total: totals.total + Number(item.quantity || 0) * Number(item.amount || 0),
    }),
    { count: 0, total: 0 },
  );
}
