export function formatModeLabel(mode) {
  if (mode === 'hybrid') return 'In-person · Online';
  return mode === 'online' ? 'Online' : 'In-person';
}
