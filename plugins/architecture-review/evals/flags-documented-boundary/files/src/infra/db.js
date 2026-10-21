export function saveOrder(order) {
  return { ...order, savedAt: Date.now() };
}
