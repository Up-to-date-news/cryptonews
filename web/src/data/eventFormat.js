export function formatModeLabel(mode) {
  if (mode === 'hybrid') return 'In-person · Online';
  return mode === 'online' ? 'Online' : 'In-person';
}

export function formatPricingLabel(pricing) {
  if (pricing === 'both') return 'Free · Paid';
  return pricing === 'paid' ? 'Paid' : 'Free';
}
