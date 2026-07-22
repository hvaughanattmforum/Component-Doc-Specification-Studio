// Picks the catalog entry (id+version+swagger URL) matching an API row's id
// and, if given, its specification version - e.g. "4" matches catalog
// version "4.1.0". Falls back to the highest-version match. IDs are matched
// case-insensitively (catalog entries are always upper-case, e.g. "TMF620",
// but typing "tmf620" should still resolve to the same API).
export function matchCatalogEntry(apiCatalog, apiId, apiVersion) {
  const idUpper = (apiId || '').toUpperCase();
  const matches = apiCatalog.filter((a) => a.id.toUpperCase() === idUpper);
  if (!matches.length) return null;
  const versionPrefix = (apiVersion || '').trim();
  if (versionPrefix) {
    const exact = matches.find((a) => a.version === versionPrefix || a.version.startsWith(`${versionPrefix}.`));
    if (exact) return exact;
  }
  return matches[matches.length - 1];
}

// Whether apiId matches any catalog entry at all, ignoring version and case
// - used to decide "is this a real, resolvable TMF API" independent of which
// specification version is currently selected.
export function isKnownApiId(apiCatalog, apiId) {
  const idUpper = (apiId || '').trim().toUpperCase();
  if (!idUpper) return false;
  return apiCatalog.some((a) => a.id.toUpperCase() === idUpper);
}
