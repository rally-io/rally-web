export interface RegionOption {
  value: string
  he: string
  en: string
}

// Coaching coverage regions for the /coaches application form.
export const ISRAEL_REGIONS: RegionOption[] = [
  { value: 'north', he: 'צפון והגליל', en: 'North & Galilee' },
  { value: 'haifa', he: 'חיפה והקריות', en: 'Haifa & Krayot' },
  { value: 'sharon', he: 'השרון', en: 'HaSharon' },
  { value: 'center', he: 'מרכז ותל אביב', en: 'Center & Tel Aviv' },
  { value: 'jerusalem', he: 'ירושלים והסביבה', en: 'Jerusalem Area' },
  { value: 'shfela-south', he: 'שפלה ודרום', en: 'Shfela & South' },
  { value: 'eilat', he: 'אילת והערבה', en: 'Eilat & Arava' },
]
