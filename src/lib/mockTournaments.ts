/**
 * Mock tournament data for design preview.
 * Enabled when VITE_USE_MOCK_DATA=true (see src/services/api/tournaments.ts).
 * Shahaf: remove this file + the USE_MOCK branch in tournaments.ts once
 * CORS is configured to allow http://localhost:5174.
 */
import type {
  ApiResponse,
  Tournament,
  TournamentDetail,
  Prize,
  Sponsor,
} from '@/types/api'
import type { TournamentListParams } from '@/services/api/tournaments'

const img = (seed: string) =>
  `https://picsum.photos/seed/${seed}/1200/675`

const thumb = (seed: string) =>
  `https://picsum.photos/seed/${seed}/600/400`

const PRIZES_STANDARD: Prize[] = [
  { id: 'p1', title: 'מקום ראשון', description: '₪3,000 + גביע', image_url: null },
  { id: 'p2', title: 'מקום שני', description: '₪1,500', image_url: null },
  { id: 'p3', title: 'מקום שלישי', description: '₪500', image_url: null },
]

const PRIZES_WOMENS: Prize[] = [
  { id: 'p1', title: 'מקום ראשון', description: '₪2,000 + גביע', image_url: null },
  { id: 'p2', title: 'מקום שני', description: '₪1,000', image_url: null },
  { id: 'p3', title: 'מקום שלישי', description: '₪400', image_url: null },
]

const SPONSORS_DEFAULT: Sponsor[] = [
  {
    id: 's1',
    name: 'Padel Pro',
    image_url: 'https://placehold.co/200x80/232328/CCFF00/png?text=Padel+Pro&font=montserrat',
    website_url: '#',
  },
  {
    id: 's2',
    name: 'Adidas Padel',
    image_url: 'https://placehold.co/200x80/232328/FFFFFF/png?text=Adidas&font=montserrat',
    website_url: '#',
  },
  {
    id: 's3',
    name: 'Rally',
    image_url: 'https://placehold.co/200x80/0055FF/FFFFFF/png?text=Rally&font=montserrat',
    website_url: 'https://rallypadel.app',
  },
]

const MOCK_TOURNAMENTS: TournamentDetail[] = [
  {
    id: 'summer-open-2026',
    name: 'Summer Open 2026',
    format: 'doubles',
    start_date: '2026-05-25T07:30:00',
    end_date: '2026-05-29T12:30:00',
    registration_deadline: '2026-05-23T12:00:00',
    skill_level_min: 2.5,
    skill_level_max: 3.0,
    skill_level: '2.5 - 3.0 (C2)',
    entry_fee: 600,
    image_url: img('rally-summer'),
    thumb_url: thumb('rally-summer'),
    structure: 'group_then_knockout',
    club_name: 'Padel Israel Petah Tikva',
    registration_id: null,
    registration_status: null,
    available_seats: 18,
    max_participants: 32,
    description:
      'טורניר הקיץ הגדול של Rally — חמישה ימים של פאדל ברמה הגבוהה ביותר במועדון פאדל ישראל פתח תקווה. ההרשמה פתוחה לכל זוגות C2.',
    prizes: PRIZES_STANDARD,
    sponsors: SPONSORS_DEFAULT,
    my_registration: null,
  },
  {
    id: 'c1-c2-may-29',
    name: 'טורניר C1-C2',
    format: 'doubles',
    start_date: '2026-05-29T07:30:00',
    end_date: '2026-05-29T12:30:00',
    registration_deadline: '2026-05-28T12:00:00',
    skill_level_min: 3.0,
    skill_level_max: 3.5,
    skill_level: '3.0 - 3.5 (C1)',
    entry_fee: 600,
    image_url: img('rally-c1c2'),
    thumb_url: thumb('rally-c1c2'),
    structure: 'group_then_knockout',
    club_name: 'a padel savion',
    registration_id: null,
    registration_status: null,
    available_seats: 16,
    max_participants: 24,
    description:
      'יום אחד, פעולה בלתי פוסקת. טורניר C1-C2 במועדון סביון — שלבי בתים ואז נוקאאוט. רק לזוגות מנוסים.',
    prizes: PRIZES_STANDARD,
    sponsors: SPONSORS_DEFAULT.slice(0, 2),
    my_registration: null,
  },
  {
    id: 'womens-cup-2026',
    name: "Women's Open Cup",
    format: 'doubles',
    start_date: '2026-06-05T08:00:00',
    end_date: '2026-06-06T14:00:00',
    registration_deadline: '2026-06-01T20:00:00',
    skill_level_min: 2.5,
    skill_level_max: 3.5,
    skill_level: '2.5 - 3.5',
    entry_fee: 450,
    image_url: img('rally-womens'),
    thumb_url: thumb('rally-womens'),
    structure: 'single_elimination',
    club_name: 'Padel Park Tel Aviv',
    registration_id: null,
    registration_status: null,
    available_seats: 4,
    max_participants: 16,
    description:
      'טורניר הנשים השני של העונה. אווירה קהילתית, רמה תחרותית — נשאר עוד מעט מקומות.',
    prizes: PRIZES_WOMENS,
    sponsors: SPONSORS_DEFAULT.slice(0, 1),
    my_registration: null,
  },
  {
    id: 'sunday-clash-june',
    name: 'Sunday Clash',
    format: 'doubles',
    start_date: '2026-06-08T16:00:00',
    end_date: '2026-06-08T21:00:00',
    registration_deadline: '2026-06-07T20:00:00',
    skill_level_min: 2.0,
    skill_level_max: 2.5,
    skill_level: '2.0 - 2.5 (C3)',
    entry_fee: 150,
    image_url: img('rally-sunday'),
    thumb_url: thumb('rally-sunday'),
    structure: 'round_robin',
    club_name: 'Rally Court Center',
    registration_id: null,
    registration_status: null,
    available_seats: 28,
    max_participants: 32,
    description:
      'אחר צהריים של פאדל קליל. רמת C3 בלבד, פורמט round robin — כולם משחקים נגד כולם.',
    prizes: [
      { id: 'p1', title: 'מקום ראשון', description: '₪1,000 + גביע', image_url: null },
      { id: 'p2', title: 'מקום שני', description: '₪500', image_url: null },
    ],
    sponsors: SPONSORS_DEFAULT.slice(2),
    my_registration: null,
  },
]

const toListItem = (t: TournamentDetail): Tournament => ({
  id: t.id,
  name: t.name,
  format: t.format,
  start_date: t.start_date,
  end_date: t.end_date,
  registration_deadline: t.registration_deadline,
  skill_level_min: t.skill_level_min,
  skill_level_max: t.skill_level_max,
  skill_level: t.skill_level,
  entry_fee: t.entry_fee,
  image_url: t.image_url,
  thumb_url: t.thumb_url,
  structure: t.structure,
  club_name: t.club_name,
  registration_id: t.registration_id,
  registration_status: t.registration_status,
  available_seats: t.available_seats,
  max_participants: t.max_participants,
})

export async function getMockTournamentList(
  params: TournamentListParams = {},
): Promise<ApiResponse<{ items: Tournament[]; next_cursor: string | null }>> {
  let items = MOCK_TOURNAMENTS.map(toListItem)

  if (params.type === 'my') {
    items = []
  }
  if (params.search) {
    const q = params.search.toLowerCase()
    items = items.filter((t) => t.name.toLowerCase().includes(q))
  }

  return {
    success: true,
    data: { items, next_cursor: null },
    error: null,
    meta: null,
  }
}

export async function getMockTournamentDetail(
  tournamentId: string,
): Promise<ApiResponse<TournamentDetail>> {
  const found = MOCK_TOURNAMENTS.find((t) => t.id === tournamentId)
  if (!found) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Tournament not found', details: null },
    }
  }
  return { success: true, data: found, error: null, meta: null }
}
