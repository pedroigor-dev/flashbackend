import { knowledge } from './knowledge';

export function resolveAnswer(raw: string) {
  const ids = new Set<string>();
  const text = raw
    .replace(/\[(fonte:)?([^\]\r\n]+)\]/gi, (marker, prefix: string | undefined, id: string) => {
      const key = id.trim().toLowerCase();
      const known = knowledge.some((entry) => entry.id === key);
      if (known) {
        ids.add(key);
      }
      return prefix || known ? '' : marker;
    })
    .replace(/[ \t]+$/gm, '')
    .trim();
  return {
    text,
    sources: knowledge
      .filter((entry) => ids.has(entry.id))
      .map(({ title, url }) => ({ title, url })),
  };
}
