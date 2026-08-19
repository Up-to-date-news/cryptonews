export function dayKeyFromDate(dateInput) {
  return new Date(dateInput).toISOString().slice(0, 10);
}
