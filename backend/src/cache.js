export function createSearchCache({ ttlMs = 10 * 60 * 1000 } = {}) {
  const entries = new Map();

  return {
    get(query) {
      const key = query.toLocaleLowerCase("pt-BR");
      const entry = entries.get(key);

      if (!entry) return null;

      if (Date.now() > entry.expiresAt) {
        entries.delete(key);
        return null;
      }

      return entry.value;
    },

    set(query, value) {
      const key = query.toLocaleLowerCase("pt-BR");
      entries.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
    },
  };
}
