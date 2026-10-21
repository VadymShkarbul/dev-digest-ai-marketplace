import { saveOrder } from '../infra/db.js';

export function orderTotal(items) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function placeOrder(items) {
  return saveOrder({ items, total: orderTotal(items) });
}
