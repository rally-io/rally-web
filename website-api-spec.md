# Rally Website — API Integration Spec

> **Who this is for:** The front-end developer building the Rally public website.  
> **What this covers:** Every endpoint the website needs, every request/response shape, every error case, and every integration rule — explained in full, nothing assumed.

---

## 1. Foundational rules

### 1.1 Base URL

All requests go to the same server as the mobile app. There is no separate website server.

```
Production:  https://<your-production-domain>
Local dev:   http://localhost:8000
```

### 1.2 All endpoints return the same envelope

Every single endpoint — success or failure — returns JSON.  
On **success** the shape is always:

```json
{
  "success": true,
  "data": <the actual data — see each endpoint below>,
  "meta": <optional extra info, e.g. pagination cursor>,
  "error": null
}
```

On **known failure** (bad input, auth required, profile incomplete, not found):

```json
{
  "success": false,
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable description",
    "details": { /* extra structured info, may be null */ }
  }
}
```

On **unexpected server error** (500):

```json
{
  "success": false,
  "error": "An unexpected error occurred"
}
```

**Rule: always check `success` first.** If it is `false`, look at `error`.

### 1.3 Authentication — how it works

The website uses Supabase for auth (same as the mobile app).  
When a user logs in via Supabase on the website, Supabase gives you a **JWT access token**.

To make an authenticated request, add this header:

```
Authorization: Bearer <supabase_jwt_token>
```

**Important:** The website audience (`/web/v1/...`) uses **optional authentication**.  
That means:

- If you send no `Authorization` header → the endpoint works, you get anonymous data.
- If you send a valid token → the endpoint works, you may get personalized data (e.g. registration status).
- If you send an invalid/expired token → the endpoint still works, treats you as anonymous (does NOT return 401).

The only time you get a `401` from the website endpoints is when you try to do a **gated action** (book a court, register for a tournament) without a token.

---

## 2. CORS — what you need to do before anything works

CORS is the browser security rule that blocks JavaScript from calling a different domain.  
By default, the API will **reject all requests from your website's domain**.

**You (or DevOps) need to add your website's origin to the `CORS_ORIGINS` environment variable on the server.**

The variable looks like this in the `.env` file:

```
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173","https://www.rallyapp.com"]
```

- `http://localhost:3000` — local dev (Next.js default)
- `http://localhost:5173` — local dev (Vite default)
- `https://www.rallyapp.com` — your production domain

**Add your real domain. If this is not set, every API call from the website will fail with a CORS error and you will see nothing in the browser network inspector except "blocked".**

---

## 3. The "onboarding" concept — read this first

When a user signs up via Supabase (email/password), a database record is automatically created for them. However, they do NOT automatically have a complete profile. The website needs to guide users to fill in missing profile fields.

There are 5 completion steps:

| Step name | What it means |
|---|---|
| `signed_in` | User has a Supabase account and is logged in |
| `first_name` | User has filled in their first name |
| `contact_number` | User has filled in their phone number |
| `player_profile` | User has a player record in our system (auto-created on first action) |
| `skill_level` | User has set their skill level |

**Key point:** `player_profile` is **automatically created** the first time a user tries to book or register for a tournament. The user does not need to explicitly "create" a profile — it happens in the background.

**What you need to build:** A profile completion ring/progress bar UI driven by the `/web/v1/me/onboarding-status` endpoint (see Section 7).

---

## 4. Website browse endpoints (no login required)

These are the main catalogue/browse pages. They work for guests (no login) and logged-in users alike.

---

### 4.1 `GET /web/v1/clubs/` — List clubs

Browse clubs with filtering and pagination. Works anonymously.

**Query parameters** (all optional unless noted):

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | string | — | Text search (club name, city). Max 100 chars. |
| `lat` | float | — | Your latitude. Must be paired with `lon`. Range: -90 to 90. |
| `lon` | float | — | Your longitude. Must be paired with `lat`. Range: -180 to 180. |
| `date` | string | today | Date to check availability for. Format: `YYYY-MM-DD` |
| `time_range` | string | — | One of: `all_day`, `morning`, `afternoon`, `evening`, `specific` |
| `time_from` | string | — | Required when `time_range=specific`. Format: `HH:MM` (e.g. `14:30`) |
| `durations` | int[] | `[60]` | Court slot duration(s) in minutes. Allowed values: `60`, `90`, `120`. Can pass multiple: `?durations=60&durations=90` |
| `court_types` | string[] | `[]` | Filter by court type. Allowed values: `indoor`, `outdoor`. Can pass multiple. |
| `sort_by` | string | `distance` | One of: `distance`, `price`. Distance only works if you sent `lat`/`lon`. |
| `max_distance` | float | `50.0` | Max distance in km. Requires `lat`/`lon`. Range: 0–50. |
| `show_without_availability` | bool | `false` | If true, also return clubs with no available slots on the selected date. |
| `cursor` | string | — | Pagination cursor. Get this value from the previous response's `meta.next_cursor`. |
| `limit` | int | `10` | How many results per page. Range: 1–20. |

**Example request (anonymous, no filters):**
```
GET /web/v1/clubs/
```

**Example request (with location and date):**
```
GET /web/v1/clubs/?lat=32.0853&lon=34.7818&date=2026-05-20&sort_by=distance&limit=10
```

**Success response** (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-of-club",
      "name": "Padel Tel Aviv",
      "city": "Tel Aviv",
      "address_line1": "123 Dizengoff St",
      "image_url": "https://cdn.example.com/clubs/123/image.jpg",
      "thumb_url": "https://cdn.example.com/clubs/123/thumb.jpg",
      "distance_km": 1.4,
      "starts_from": 80.0,
      "has_availability": true,
      "court_types": ["indoor", "outdoor"],
      "amenities": ["parking", "showers"],
      "description": "Best padel in the city",
      "booking_ahead_limit": 7,
      "setup_complete": true,
      "available_slots": [
        {
          "start_time": "10:00",
          "end_time": "11:00",
          "available": true,
          "price": 80.0,
          "service_fee": 5.0,
          "duration": 60,
          "available_courts": [
            { "id": "uuid", "name": "Court 1", "type": "indoor" }
          ]
        }
      ]
    }
  ],
  "meta": {
    "next_cursor": "eyJpZCI6IjEyMyJ9"
  },
  "error": null
}
```

**Notes on `data` fields:**
- `distance_km` — only present if you sent `lat`/`lon`. Will be `null` otherwise.
- `starts_from` — the cheapest slot price available at this club on the selected date.
- `has_availability` — `true` means there's at least one bookable slot today. If `false`, the club is full or not operating.
- `available_slots` — the list of bookable time slots. Empty if `has_availability` is false.
- `next_cursor` — if this is `null`, there are no more pages. If it has a value, pass it as `?cursor=<value>` on the next request to get the next page.

**Validation error** (`422`):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "sort_by must be one of: distance, price",
    "details": null
  }
}
```

---

### 4.2 `GET /web/v1/clubs/{club_id}` — Club detail

Get full details for a single club, including all available slots on a given date.

**URL parameter:**
- `club_id` — UUID of the club (e.g. `123e4567-e89b-12d3-a456-426614174000`)

**Query parameters** (all optional):

| Parameter | Type | Default | Description |
|---|---|---|---|
| `date` | string | today | Date to check availability. Format: `YYYY-MM-DD` |
| `duration` | int | `60` | Slot duration in minutes. Allowed: `60`, `90`, `120`. |
| `lat` | float | — | Your latitude (for distance calc). Must be paired with `lon`. |
| `lon` | float | — | Your longitude. Must be paired with `lat`. |

**Example request:**
```
GET /web/v1/clubs/123e4567-e89b-12d3-a456-426614174000?date=2026-05-20&duration=90
```

**Success response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "uuid-of-club",
    "name": "Padel Tel Aviv",
    "city": "Tel Aviv",
    "address_line1": "123 Dizengoff St",
    "image_url": "...",
    "thumb_url": "...",
    "distance_km": null,
    "starts_from": 80.0,
    "has_availability": true,
    "court_types": ["indoor"],
    "amenities": ["parking"],
    "description": "Best padel in the city",
    "booking_ahead_limit": 7,
    "setup_complete": true,
    "available_slots": [ ... ]
  },
  "meta": null,
  "error": null
}
```

**Not found response** (`404`):
```json
{
  "detail": "Club not found"
}
```

Note: The 404 returns a plain FastAPI error shape (not the `success/error` envelope). Check for HTTP status `404` directly.

---

### 4.3 `GET /web/v1/tournaments/` — List tournaments

Browse upcoming tournaments. Works anonymously.

**Query parameters** (all optional):

| Parameter | Type | Default | Description |
|---|---|---|---|
| `cursor` | string | — | Pagination cursor from previous response's `meta.next_cursor` |
| `limit` | int | `10` | Results per page. Range: 1–50. |
| `search` | string | — | Text search. Min 1 char, max 100 chars. |

**Important:** This endpoint always returns `type=upcoming` tournaments only. The "My tournaments" concept from the mobile app does not apply here. Anonymous users see all upcoming tournaments.

**Example request:**
```
GET /web/v1/tournaments/?limit=10
```

**Success response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Rally Open Championship",
        "format": "doubles",
        "start_date": "2026-06-01T09:00:00Z",
        "end_date": "2026-06-02T18:00:00Z",
        "registration_deadline": "2026-05-25T23:59:00Z",
        "skill_level_min": 2.0,
        "skill_level_max": 5.0,
        "skill_level": "Intermediate",
        "entry_fee": 150.0,
        "image_url": "https://cdn.example.com/tournaments/123/image.jpg",
        "thumb_url": "https://cdn.example.com/tournaments/123/thumb.jpg",
        "structure": "round_robin",
        "club_name": "Padel Tel Aviv",
        "registration_id": null,
        "registration_status": null,
        "available_seats": 8
      }
    ],
    "next_cursor": null
  },
  "meta": null,
  "error": null
}
```

**Notes on `data.items` fields:**
- `registration_id` — Will be a UUID if the logged-in user is registered; `null` for anonymous users or unregistered users.
- `registration_status` — The user's registration status if registered (e.g. `"registered"`, `"waitlisted"`). `null` for anonymous.
- `available_seats` — How many spots are left. `0` means full.
- `format` — `"singles"` or `"doubles"` or `"mixed"`.
- `entry_fee` — In ILS (₪). May be `0` for free tournaments.

---

### 4.4 `GET /web/v1/tournaments/{tournament_id}` — Tournament detail

Get full details for a single tournament.

**URL parameter:**
- `tournament_id` — UUID of the tournament

**Example request:**
```
GET /web/v1/tournaments/123e4567-e89b-12d3-a456-426614174000
```

**Success response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Rally Open Championship",
    "format": "doubles",
    "start_date": "2026-06-01T09:00:00Z",
    "end_date": "2026-06-02T18:00:00Z",
    "registration_deadline": "2026-05-25T23:59:00Z",
    "skill_level_min": 2.0,
    "skill_level_max": 5.0,
    "skill_level": "Intermediate",
    "entry_fee": 150.0,
    "image_url": "...",
    "thumb_url": "...",
    "structure": "round_robin",
    "club_name": "Padel Tel Aviv",
    "registration_id": null,
    "registration_status": null,
    "available_seats": 8,
    "description": "The biggest padel open in Tel Aviv",
    "max_participants": 32,
    "prizes": [
      {
        "id": "uuid",
        "title": "1st Place",
        "description": "Trophy + 500 ILS store credit",
        "image_url": null
      }
    ],
    "sponsors": [
      {
        "id": "uuid",
        "name": "Wilson",
        "image_url": "https://cdn.example.com/sponsors/wilson.png",
        "website_url": "https://wilson.com"
      }
    ],
    "my_registration": null
  },
  "meta": null,
  "error": null
}
```

**Notes:**
- `my_registration` — `null` for anonymous users. If the user is logged in and registered, this object shows their registration status (payment, partner, etc).
- `prizes` / `sponsors` — can be empty arrays `[]`.

**Not found response** (`404`):
```json
{
  "detail": "Tournament not found"
}
```

Same as clubs: check for HTTP status `404`.

---

## 5. Gated actions — booking a court

Booking requires the user to be logged in AND have a phone number set on their profile.

**Endpoint:** `POST /rally/v1/bookings/`

**Headers required:**
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Request body:**
```json
{
  "club_id": "uuid-of-club",
  "court_id": "uuid-of-court",
  "booking_date": "2026-05-20",
  "start_time": "10:00:00",
  "end_time": "11:00:00",
  "use_credits": false
}
```

**Field notes:**
- `court_id` — you get this from the `available_courts` list inside the club detail response (see 4.2). It's the specific court the user wants.
- `start_time` / `end_time` — time in `HH:MM:SS` format (include the seconds, always `:00`).
- `use_credits` — `true` if the user wants to apply their wallet credits toward the booking.

**Success response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "club_id": "uuid",
    "court_id": "uuid",
    "booking_date": "2026-05-20",
    "start_time": "10:00:00",
    "end_time": "11:00:00",
    "total_price": 80.0,
    "service_fee": 5.0,
    "credits_applied": 0.0,
    "amount_to_pay": 85.0,
    "status": "payment_pending",
    "payment_status": "pending",
    "within_cancellation_window": true,
    "amount_credited": null,
    "club_name": "Padel Tel Aviv",
    "court_name": "Court 1",
    "court_type": "indoor",
    "image_url": "...",
    "club_timezone": "Asia/Jerusalem"
  },
  "error": null
}
```

**Note on `status`:** After creating a booking it will be `payment_pending` and a payment hold is created. The user needs to complete payment. Your payment flow is separate — ask the backend team about HYP payment integration.

### 5.1 Error: not logged in (`401`)

If no `Authorization` header is sent:
```json
{
  "detail": "Authentication required"
}
```

This is a plain FastAPI error (not the envelope). Check HTTP status `401`.

### 5.2 Error: profile fields missing (`422`)

**This is the most important error to handle on the website.**

If the user is logged in but hasn't set their phone number, you will receive:

```json
{
  "success": false,
  "error": {
    "code": "PROFILE_FIELDS_REQUIRED",
    "message": "Profile fields required to perform this action",
    "details": {
      "action": "book_court",
      "missing_fields": [
        {
          "field": "contact_number",
          "label": "Phone number",
          "scope": "user"
        }
      ]
    }
  }
}
```

**What you must do when you receive `PROFILE_FIELDS_REQUIRED`:**

1. Read `error.details.missing_fields` — this is a list of exactly what's missing.
2. Show a modal/drawer asking the user to fill in those fields.
3. Fields that can appear in `missing_fields`:

| `field` | `label` | What to render |
|---|---|---|
| `contact_number` | `"Phone number"` | Phone number input |
| `skill_level` | `"Skill level"` | Skill level picker |

4. After the user fills in the missing fields, **re-submit the original request** (e.g. book the court again). The backend has already created the player profile in the background, so the second attempt will work if the fields are now filled.

**Important:** The player profile is auto-created by the backend the first time the user hits a gated action, even if the action fails due to missing fields. The user doesn't need to do any "create profile" step.

---

## 6. Gated actions — registering for a tournament

Same pattern as booking, but requires phone number AND skill level.

**Endpoint:** `POST /rally/v1/tournaments/{tournament_id}/register`

**Headers required:**
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**URL parameter:**
- `tournament_id` — UUID of the tournament to register for

**Request body:**
```json
{
  "partner_type": "none",
  "partner_player_id": null,
  "invite_first_name": null,
  "invite_last_name": null,
  "invite_phone": null,
  "invite_country_code": null,
  "use_credits": false
}
```

**`partner_type` options:**
- `"none"` — singles tournament, no partner needed
- `"existing"` — doubles, partner already has an account. Also send `partner_player_id` (their UUID).
- `"invite"` — doubles, invite a guest. Also send `invite_first_name`, `invite_last_name`, `invite_phone`, `invite_country_code`.

**Success response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "registration-uuid",
    "tournament_id": "uuid",
    "player_1_id": "uuid",
    "player_2_id": null,
    "player_2_name": null,
    "guest_player_2_id": null,
    "guest_player_2_name": null,
    "team_name": null,
    "status": "registered",
    "payment_status": null,
    "credits_applied": 0.0,
    "service_fee": 0.0,
    "amount_to_pay": 150.0,
    "amount_credited": null,
    "entry_fee": 150.0,
    "tournament_name": "Rally Open Championship",
    "tournament_club_name": "Padel Tel Aviv",
    "image_url": "...",
    "thumb_url": "...",
    "start_date": "2026-06-01T09:00:00Z",
    "end_date": "2026-06-02T18:00:00Z",
    "within_cancellation_window": true
  },
  "error": null
}
```

### 6.1 Error: not logged in (`401`)

Same as booking — plain `{ "detail": "Authentication required" }` with HTTP `401`.

### 6.2 Error: profile fields missing (`422`)

For tournament registration, both `contact_number` AND `skill_level` may be required:

```json
{
  "success": false,
  "error": {
    "code": "PROFILE_FIELDS_REQUIRED",
    "message": "Profile fields required to perform this action",
    "details": {
      "action": "register_tournament",
      "missing_fields": [
        {
          "field": "contact_number",
          "label": "Phone number",
          "scope": "user"
        },
        {
          "field": "skill_level",
          "label": "Skill level",
          "scope": "player"
        }
      ]
    }
  }
}
```

Same flow as booking: show the modal for the missing fields, then re-submit the registration. The `missing_fields` array will only contain what's actually missing — if the user already has a phone but no skill level, only `skill_level` appears.

---

## 7. Onboarding status / profile ring

Use this endpoint to drive a profile completion ring on the website (e.g. in the header or profile page).

**Endpoint:** `GET /web/v1/me/onboarding-status`

**Authentication:** Optional. Send the token if the user is logged in.

---

**Case 1: Anonymous user (no Authorization header)**

```
GET /web/v1/me/onboarding-status
```

Response:
```json
{
  "success": true,
  "data": {
    "is_authenticated": false,
    "has_player_profile": false,
    "completion_percent": 0,
    "completed_steps": [],
    "missing_steps": ["signed_in", "first_name", "contact_number", "player_profile", "skill_level"]
  }
}
```

When `is_authenticated` is `false`, show a "Sign in" CTA instead of the ring.

---

**Case 2: Logged-in user with partial profile**

```
GET /web/v1/me/onboarding-status
Authorization: Bearer <token>
```

Response (user has first_name but no phone, no player profile yet):
```json
{
  "success": true,
  "data": {
    "is_authenticated": true,
    "has_player_profile": false,
    "completion_percent": 40,
    "completed_steps": ["signed_in", "first_name"],
    "missing_steps": ["contact_number", "player_profile", "skill_level"]
  }
}
```

---

**Case 3: Fully onboarded user**

```json
{
  "success": true,
  "data": {
    "is_authenticated": true,
    "has_player_profile": true,
    "completion_percent": 100,
    "completed_steps": ["signed_in", "first_name", "contact_number", "player_profile", "skill_level"],
    "missing_steps": []
  }
}
```

### How to build the ring

- Read `completion_percent` and use it to fill a circular progress indicator.
- Read `missing_steps` to know what nudges to show the user (e.g. "Add your phone number to book courts").
- Poll this endpoint after the user saves their profile — it will update immediately.
- `has_player_profile` will become `true` automatically after the user's first booking/registration attempt (player profile is auto-created in the background at that point).

**Step completion logic (for reference):**

| Step | Becomes "completed" when |
|---|---|
| `signed_in` | Always true once logged in |
| `first_name` | `User.first_name` is not empty |
| `contact_number` | `User.contact_number` is not empty |
| `player_profile` | A `Player` row exists for this user |
| `skill_level` | `Player.skill_level` is set |

---

## 8. How to update user profile fields

When the user fills in missing fields (triggered by `PROFILE_FIELDS_REQUIRED`), use the existing **mobile player update endpoint**:

**Endpoint:** `PATCH /rally/v1/players/me`

**Headers:**
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Request body (send only the fields you're updating):**
```json
{
  "contact_number": "+972501234567",
  "skill_level": 3.5
}
```

**Note:** `skill_level` is a float from `1.0` to `7.0`. Ask the product team for the exact levels and their labels (e.g. "Beginner" = 1.0–2.0, etc.).

---

## 9. Pagination — how it works

All list endpoints (`/clubs/`, `/tournaments/`) use **cursor-based pagination**.

1. Make your first request without a cursor — you get the first page of results.
2. Check `meta.next_cursor` in the response.
3. If `next_cursor` is `null` → you are on the last page, no more data.
4. If `next_cursor` has a string value → pass it as `?cursor=<value>` on your next request to get the next page.
5. Repeat until `next_cursor` is `null`.

Example:
```
# First request
GET /web/v1/clubs/?limit=10

# Response contains: "meta": { "next_cursor": "eyJpZCI6IjEyMyJ9" }

# Second request
GET /web/v1/clubs/?limit=10&cursor=eyJpZCI6IjEyMyJ9

# Response contains: "meta": { "next_cursor": null }

# Done — no more pages
```

The cursor is **opaque** — do not try to decode or modify it. Treat it as a black-box string.

---

## 10. Summary — what you need to build

| Feature | Endpoint | Auth needed? |
|---|---|---|
| Club listing/browse page | `GET /web/v1/clubs/` | No |
| Club detail page | `GET /web/v1/clubs/{club_id}` | No |
| Tournament listing/browse page | `GET /web/v1/tournaments/` | No |
| Tournament detail page | `GET /web/v1/tournaments/{tournament_id}` | No |
| Profile completion ring | `GET /web/v1/me/onboarding-status` | Optional |
| Book a court | `POST /rally/v1/bookings/` | Yes |
| Register for tournament | `POST /rally/v1/tournaments/{id}/register` | Yes |
| Update profile fields | `PATCH /rally/v1/players/me` | Yes |

## 11. Checklist — things that WILL break if you skip them

- [ ] CORS origins configured on the server to include your domain (see Section 2)
- [ ] `PROFILE_FIELDS_REQUIRED` (422) is handled everywhere you call a gated action — show the missing-fields modal (see Sections 5.2 and 6.2)
- [ ] After the user fills in missing fields and saves, **re-submit the original action** (the backend does not retry automatically)
- [ ] `401` is handled on gated actions — redirect to login or show login modal
- [ ] `404` is handled on detail pages — show a "not found" page
- [ ] Cursor pagination implemented correctly — never hardcode page numbers
- [ ] Dates are sent as `YYYY-MM-DD` (e.g. `2026-05-20`), not timestamps
- [ ] Times are sent as `HH:MM:SS` (e.g. `10:00:00`), not `HH:MM`
- [ ] `lat`/`lon` are always sent together or not at all (sending only one returns a 422)
