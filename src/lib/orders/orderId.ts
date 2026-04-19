export function generateOrderId(date = new Date()) {
  const yyyy = date.getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `LK-${yyyy}-${rand}`;
}

