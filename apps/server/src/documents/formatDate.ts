export function formatSignedAt(isoString: string): string {
  const date = new Date(isoString);
  const datePart = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timePart = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
  return `${datePart} ${timePart} (МСК)`;
}
