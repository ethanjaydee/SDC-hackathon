/** A saved price snapshot ages even when nobody opens the comparison page. */
export function isOfferStale(checkedAt, flagged = false, now = Date.now()) {
  const timestamp = Date.parse(checkedAt);
  return flagged || !Number.isFinite(timestamp) || timestamp > now + 60_000 ||
    now - timestamp > 24 * 60 * 60 * 1000;
}
