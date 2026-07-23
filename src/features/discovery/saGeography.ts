/**
 * A compact South African geography fallback: the nine provinces and their major cities and
 * operating localities. It is a SEED for a manual Province → locality picker, used only when
 * Google Places is unavailable (no key, script blocked, or the public reference API is down) —
 * never a permanent hardcoded wall on the discovery page.
 *
 * These are safe PUBLIC operating-area labels (a suburb or town a talent is "based in" or
 * "available in"), not live positions and never a talent's real coordinates or address.
 */

export interface SaProvince {
  /** Stable id for selection state (kebab of the name). */
  id: string;
  name: string;
  /** Representative operating localities, most prominent first. */
  localities: string[];
}

export const SA_PROVINCES: SaProvince[] = [
  {
    id: "gauteng",
    name: "Gauteng",
    localities: [
      "Johannesburg", "Sandton", "Rosebank", "Braamfontein", "Soweto", "Randburg", "Midrand",
      "Pretoria Central", "Pretoria", "Centurion", "Fourways", "Roodepoort", "Benoni", "Kempton Park",
    ],
  },
  {
    id: "western-cape",
    name: "Western Cape",
    localities: [
      "Cape Town", "Cape Town CBD", "Sea Point", "Camps Bay", "Green Point", "Claremont",
      "Stellenbosch", "Somerset West", "Paarl", "Bellville", "Durbanville",
    ],
  },
  {
    id: "kwazulu-natal",
    name: "KwaZulu-Natal",
    localities: [
      "Durban", "Umhlanga", "Ballito", "Morningside", "Berea", "Pinetown", "Pietermaritzburg",
      "Richards Bay",
    ],
  },
  {
    id: "eastern-cape",
    name: "Eastern Cape",
    localities: ["Gqeberha", "East London", "Mthatha", "Uitenhage", "King William's Town"],
  },
  {
    id: "free-state",
    name: "Free State",
    localities: ["Bloemfontein", "Welkom", "Bethlehem", "Sasolburg"],
  },
  {
    id: "mpumalanga",
    name: "Mpumalanga",
    localities: ["Mbombela", "Witbank", "Secunda", "Middelburg", "Ermelo"],
  },
  {
    id: "limpopo",
    name: "Limpopo",
    localities: ["Polokwane", "Tzaneen", "Thohoyandou", "Mokopane", "Bela-Bela"],
  },
  {
    id: "north-west",
    name: "North West",
    localities: ["Rustenburg", "Mahikeng", "Potchefstroom", "Klerksdorp", "Brits"],
  },
  {
    id: "northern-cape",
    name: "Northern Cape",
    localities: ["Kimberley", "Upington", "Springbok", "Kuruman"],
  },
];

/** All localities flattened, for a quick "based in {locality}" lookup / free search. */
export function allLocalities(): { province: string; locality: string }[] {
  return SA_PROVINCES.flatMap((p) => p.localities.map((locality) => ({ province: p.name, locality })));
}

/** Finds the province a locality belongs to (case-insensitive), or null. */
export function provinceForLocality(locality: string): string | null {
  const needle = locality.trim().toLowerCase();
  for (const province of SA_PROVINCES) {
    if (province.localities.some((l) => l.toLowerCase() === needle)) return province.name;
  }
  return null;
}
