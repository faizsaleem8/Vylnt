/** Presentation only: never rewrite frozen model/report content or its hashes. */
export function productLabel(value: string): string {
  return value.replace(/VYNLT/g, 'VYLNT').replace(/Vynlt/g, 'Vylnt').replace(/vynlt/g, 'vylnt');
}
