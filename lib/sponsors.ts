/**
 * Marlin Key's paid programming.
 *
 * A pirate station still has to sell airtime, and in a town where the money
 * arrives by boat the only people buying spots are the fronts. Every business
 * below is invented for Dead Air: the names, the taglines and the small print
 * are original writing, and none of them is a real company, a real brand, or
 * anything belonging to any game franchise. `tests/station-texture.test.mjs`
 * enforces that — it fails on a franchise term, on a known real-world brand
 * name, and on a duplicated or empty field.
 *
 * These run in three places, all of them in-world:
 *  - a one-line lower third on the live feed,
 *  - the rotating PAID PROGRAMMING strip at the control desk,
 *  - the "tonight's broadcast was paid for by" card on the episode screen.
 */
export type Sponsor = {
  /** The business, as it appears on the bug. */
  name: string;
  /** The spot itself. One dry line. */
  line: string;
  /** The small print underneath. */
  strap: string;
};

export const sponsors: Sponsor[] = [
  {
    name: "PELICAN TRUST MARINA",
    line: "Slip rentals paid in cash. Questions paid in silence.",
    strap: "BERTHS 1–40 · NO WAKE, NO NAMES",
  },
  {
    name: "SLACK TIDE LINEN & LAUNDRY",
    line: "Same-day service, sixty locations, four customers. We handle volume.",
    strap: "COMMERCIAL ACCOUNTS ONLY · MARLIN KEY",
  },
  {
    name: "HALCYON BAY CURRENCY EXCHANGE",
    line: "Nine branches. One depositor. Open all night.",
    strap: "NO LIMIT · NO LEDGER · NO PROBLEM",
  },
  {
    name: "NIGHT HERON SELF-STORAGE",
    line: "Climate controlled. Cameras optional.",
    strap: "UNITS FROM 5×5 TO DON'T ASK",
  },
  {
    name: "ROUNDING ERROR ACCOUNTING",
    line: "We round up. Everything.",
    strap: "TAX SEASON IS A STATE OF MIND",
  },
  {
    name: "DEADRISE TOWING & SALVAGE",
    line: "If it sank here, we found it first.",
    strap: "24-HOUR RECOVERY · DISCRETION INCLUDED",
  },
  {
    name: "EGRET POINT RESIDENCES",
    line: "Pre-construction pricing on a tower that will never be built.",
    strap: "OWN THE VIEW BEFORE THE VIEW EXISTS",
  },
  {
    name: "PERPETUAL TROPHY & ENGRAVING",
    line: "Custom awards since 1994. We have never once asked what for.",
    strap: "ENGRAVING WHILE YOU WAIT",
  },
  {
    name: "THE SILVER KING ROOM",
    line: "Valet parking for cars you would rather not park yourself.",
    strap: "DINNER UNTIL THE LIGHTS GO OUT",
  },
  {
    name: "HURRICANE SEASON MUTUAL",
    line: "Total coverage, provided the wind comes from the agreed direction.",
    strap: "CLAIMS REVIEWED BY A COUSIN",
  },
];

/*
 * Similarity check, 17 September 2026. Every name above was searched for as a
 * real trading name before it shipped, and three were rewritten because the
 * search found live businesses too close to them: "Cormorant Self-Storage"
 * (Cormorant Storage, Becker County MN), "Blue Ledger Accounting" (several US
 * bookkeeping firms trading as Blue Ledger) and "The Tarpon Room" (adjacent to
 * Tarpon Lodge & Restaurant and to Tarpon Springs, FL). Their replacements —
 * Night Heron Self-Storage, Rounding Error Accounting and The Silver King Room
 * — returned no matching business. `tests/station-texture.test.mjs` keeps the
 * rejected names, and every franchise term, out of the list mechanically.
 */

/**
 * The spot at `index`, wrapped so any integer is safe. The rotation is a plain
 * counter in the component, so it never has to be clamped at the call site and
 * a long night simply keeps cycling the same ten spots.
 */
export const sponsorAt = (index: number): Sponsor =>
  sponsors[((index % sponsors.length) + sponsors.length) % sponsors.length];
