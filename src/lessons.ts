export const titleFromFile = (name: string) => name
  .replace(/\.[^.]+$/, '')
  .replace(/[_-]+/g, ' ')
  .replace(/^\s*\d+[\s.)-]*/, '')
  .trim()

export function sortLessonNames(names: string[], locale?: string) {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' })
  return [...names].sort(collator.compare)
}
