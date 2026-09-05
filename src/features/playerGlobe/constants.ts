/* Every tunable of the player globe, in one place. The values (and the reasoning next to
   them) come from the padel-globe mock this feature was ported from; the look was tuned
   against exactly this render pipeline, so change them from a screenshot, not from theory. */

import type { SkillTier } from './types'

/* Rim colour by skill tier. Bloom-safe (every channel below 1.0 after lighting is not a
   concern — sprites are unlit), distinct on the dark felt, and readable next to the
   navbar's bronze / silver / gold avatar rings. */
export const TIER_COLOR: Record<SkillTier, string> = {
  bronze: '#d98c4a',
  silver: '#b8c4d6',
  gold: '#f2d16b',
}
/** players without a level */
export const NO_TIER_COLOR = '#7a8b9c'

export const PARTNER_RGB: readonly [number, number, number] = [0.72, 1.0, 0.13]
export const RIVAL_RGB: readonly [number, number, number] = [0.62, 0.84, 1.0]

/* ---------- geometry ---------- */

export const BALL_RADIUS = 121 // shell the players sit on
/* The players sit 7 units above the felt (BALL_RADIUS - CORE_RADIUS), about half a portrait, so
   they read as pins pressed into the ball rather than a ring floating around it. Sprites do not
   depth-test against the ball (see OCCLUDE_FEATHER), so the gap does not have to clear the
   sprite; it only has to clear the fur (FUR_HEIGHT) and give the arcs room to leave the felt.
   With real data the busiest player has ~7 partners, a sprite half-size of ~16 units. */
export const CORE_RADIUS = 114
export const NODE_BASE = 13 // portrait diameter for a player with no partners, at NODE_REFERENCE_COUNT players
export const NODE_PER_PARTNER = 0.75 // growth per partner — the busiest player is ~1.4x the smallest
/* Collide radius as a multiple of the portrait radius: the mock's 6 + 0.36/partner over a
   4.3 + 0.25/partner portrait, i.e. players keep ~40% of a portrait clear around them. */
export const NODE_COLLIDE_RATIO = 1.4
/* Portraits scale with the population so the felt stays about equally covered: the sizes above
   were tuned for ~120 players, and the ball's surface is fixed, so the diameter follows
   sqrt(reference / count) — a quarter of the players doubles the portrait, four times halves it —
   clamped so a near-empty ball does not become a few giant faces and a crowded one stays legible. */
export const NODE_REFERENCE_COUNT = 120
export const NODE_SIZE_FACTOR_MIN = 0.6
export const NODE_SIZE_FACTOR_MAX = 1.8
/** the portrait fills this fraction of the avatar texture; the rest is glow falloff */
export const NODE_PORTRAIT_FRACTION = 0.58
export const ARC_SEG = 36 // enough segments that curves read smooth, not kinked
/* Arcs hug the shell, the way the reference globe's flight paths sit just above the surface.
   Lift used to reach 84 on a 134 shell, which bowed every arc out to 1.6x the radius — that
   was the cobweb overflowing the viewport. */
export const ARC_LIFT_K = 0.14
export const ARC_LIFT_MAX = 30
export const ARC_LINE_WIDTH_PX = 2.6

/* ---------- pulses ---------- */

/* At rest NO arc is drawn. A small pool of streaks spawns, flies and vanishes — an arc only
   exists while a pulse is on it. That is what makes the reference read as live traffic rather
   than a ball of string, and it also means every partnership gets shown over time instead of
   a fixed "featured" subset. */
export const AMBIENT_PULSES = 22
export const FOCUS_PULSES = 6 // extra streaks that run only on the pinned player's arcs
export const AMBIENT_DIM = 0.3 // ambient traffic fades back while a player is pinned
export const PULSE_UNITS_PER_SEC = 120 // roughly constant speed: long arcs take longer
export const PULSE_DUR_MIN = 0.9
export const PULSE_DUR_MAX = 2.4
export const PULSE_GAP_MIN = 0.05 // idle time before a slot respawns
export const PULSE_GAP_MAX = 0.6
export const PULSE_TAIL = 0.34 // fraction of the arc lit behind the head
export const PULSE_GAIN = 1.45 // absolute brightness at the head, not a multiplier
export const PULSE_GAMES_CAP = 34 // games at which a pulse reaches full heat

/* Pinned (clicked) player: their arcs are solid and stay until deselected. Hover is a lighter
   layer ON TOP — it must never replace the pinned arcs. */
export const PINNED_PARTNER = 0.36
export const PINNED_RIVAL = 0.22
export const HOVER_LEVEL = 0.22
export const DIM = 0.12

/* ---------- ball glow ---------- */

/* Ball glow — lit from the INSIDE, like the reference globe, with nothing drawn AROUND the
   ball: no halo, no atmosphere shell. The inner light is centre-bright (brightest where the
   surface faces the camera, falling off to the edge — a frosted ball with a lamp in it), kept
   under the bloom threshold so the ball never blooms and the portraits near the rim stay
   intact. A faint limb on the surface itself softens the silhouette. */
export const GLOW_COLOR = 0xe9ffc2 // pale lime-white: the felt's own colour, lit
export const INNER_GAIN = 0.16 // centre-bright inner light on the ball surface (the felt is lit now, so low)
export const LIMB_GAIN = 0.08 // soft edge; the felt sheen does most of the limb work

/* ---------- logo coin ---------- */

/* Logo coin. The Rally logo as it appears on the web — the blue disc with the lime R — is NOT
   printed on the felt: it is a separate object, the way the reference globe's land sits on its
   sea. A round plate with a bevelled edge, bent onto the sphere just above the felt, carrying
   the real icon artwork on its glossy top, with a darker blue rim, lit by the key light and
   casting its shadow onto the felt. Two coins, one in the centre of a bulb of each lobe — the
   points farthest from the seam. The raster is the icon tile itself (1024 px). */
export const LOGO_URL = '/globe/rally-logo.png'
export const LOGO_HALF_ANGLE = 0.36 // radians; the tile spans ~41 degrees of the ball
export const LOGO_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [135, 18],
  [225, -18],
] // [azimuth, elevation] in degrees, in the seam's frame
export const LOGO_DISC = 0.96 // coin diameter as a fraction of the tile
export const LOGO_MARK_SCALE = 0.86 // the artwork shrunk about the centre so the R gets margin
export const LOGO_DISC_COLOR = 0x0055ff // the tile's own blue, fills the disc under the artwork
export const LOGO_RIM_COLOR = 0x0a3fcf // side walls and bevel — a darker blue coin edge
export const LOGO_LID_DIM = 0xbcbcbc // multiplies the artwork: lit lime must stay under bloom
export const LOGO_LIFT = 2.6 // felt to coin underside: just above the fur, so it sits IN the fuzz
export const LOGO_THICKNESS = 1.8 // coin thickness, world units
export const LOGO_BEVEL = 0.7 // rounded edge: thickness (world units) ...
export const LOGO_BEVEL_PX = 6 // ... and outward size, in tile px (~0.09 units each)
/* Longest lid-triangle edge allowed before bending, tile px. Earcut fans the disc with long
   thin triangles; bent onto the sphere, a flat triangle 40 degrees wide sags ~7 units below
   the surface at its middle and the felt pokes up THROUGH the coin. 48 px is ~2.7 degrees. */
export const LOGO_MAX_EDGE_PX = 48
/* A soft baked contact shadow under the coin, offset down-right so it falls away from the key
   light — the real cast shadow does the rest. In tile px. */
export const LOGO_SHADOW_PX = 32
export const LOGO_SHADOW_OFFSET: readonly [number, number] = [12, 16]
export const LOGO_SHADOW_DARK = 0.3
export const LOGO_TILE_PX = 1024

/* ---------- occlusion, seam, bloom ---------- */

/* Node sprites do NOT depth-test against the ball: they are camera-facing quads, and near the
   rim the ball's bulge sits in front of the quad's inner half and eats the portrait. Instead,
   each frame, a sprite is hidden when the line from the camera to it passes through the ball,
   fading over this band (world units) either side of the silhouette so nothing pops. */
export const OCCLUDE_FEATHER = 3
/* Seam tilt off the texture poles, so the auto-rotation shows it sweeping rather than
   symmetric. Shared by the seam stroke and the logo projection, which must agree. */
export const SEAM_TILT_X = 0.55
export const SEAM_TILT_Y = 0.35

/* ---------- ball texture ----------
   An equirectangular 2:1 map, built to three's SphereGeometry convention: canvas top row is
   the north pole (+y), canvas x runs with phi = atan2(z, -x). Seeded, so the ball is identical
   on every load. To use a PHOTO instead, drop a 2:1 equirectangular image in public/ and name
   it in BALL_TEXTURE_URL — a plain photo of a ball will not wrap, it needs the 2:1 map. */
export const BALL_TEXTURE_URL = ''
export const BALL_TEX_W = 2048
export const BALL_TEX_H = 1024
export const BALL_TEX_SEED = 20260902
export const SEAM_A = 0.7 // seam shape: a + b = 1 keeps the curve exactly on the sphere
export const SEAM_PX = 26 // strip width in texture px at the equator (~4% of the diameter)
/* Felt albedo is kept dark on purpose: the scene lights it at up to ~1.4x (ambient 0.8 +
   directional 0.6) plus our key light, and anything that lands above the bloom threshold
   turns the front of the ball into a white blob. */
export const FELT_DARK: readonly [number, number, number] = [0x55, 0x63, 0x18]
export const FELT_LIGHT: readonly [number, number, number] = [0x8c, 0xa1, 0x26]
/* Photographic felt. When this file exists (a tileable felt photo — ambientCG's CC0 Fabric034
   colour map) it replaces the procedural grain: the photo is tiled across the map and
   multiplied by FELT_TINT so a grey felt becomes optic yellow, and its luminance becomes the
   bump grain. The seam, logo shadow and coins draw on top as before. If the file is missing
   the procedural felt is used, silently. */
export const BALL_FELT_URL = '/globe/felt.jpg'
export const FELT_TILES: readonly [number, number] = [4, 2] // repeats across / down the 2:1 map (across must be an integer)
export const FELT_TINT = '#d9f228' // multiply colour: grey photo -> neon optic yellow
export const FELT_BUMP_MIX = 0.45 // how much of the photo's luminance goes into the bump
/* Fur. A real ball's felt is hair: it fuzzes the silhouette and softens every edge. Shell
   rendering: FUR_SHELLS copies of the sphere, each a little larger, each drawn through a hair
   mask with a rising alpha test, so the layers thin out toward the tips. None on the seam. */
export const FUR_SHELLS = 10
export const FUR_HEIGHT = 2.4 // world units the fuzz stands off the felt (~2% of the radius)
export const FUR_TIP_LIGHT = 1.12 // tips a touch lighter than the base — they catch the light
/* Bloom threshold. The felt is bright on purpose, so the threshold sits at 1.0: only
   additive things (pulses, node rims) exceed it; lit surfaces peak at or under it. */
export const BLOOM_THRESHOLD = 1.0
export const BLOOM_STRENGTH = 0.55
export const BLOOM_RADIUS = 0.5

/* ---------- spin and camera ---------- */

/* Spin. The ball turns in place under the pointer like a trackball; the camera is pinned on
   its axis and only dollies (wheel, focus, reset). */
export const IDLE_SPIN = 0.06 // rad/s about world up when nobody is touching it
export const DRAG_RAD_PER_PX = 0.0045 // how far a pixel of drag turns the ball
export const SPIN_FRICTION = 0.06 // fraction of fling velocity left after one second
export const FOCUS_DIST = 340 // camera distance when a player is focused
export const FOCUS_MS = 900
export const FIT_MS = 800
export const FIT_PADDING_PX = 40
/* The reference pipeline started the camera at cbrt(nodeCount) * this, then fitted the settled
   layout. Kept so the opening dolly reads the same. */
export const CAMERA_DISTANCE_PER_CBRT_NODE = 170
export const CAMERA_FAR = 9000 // stars sit far out; the default far plane clips them
export const STAR_COUNT = 1500
export const STAR_MIN_R = 1500
export const STAR_SPREAD_R = 1100
/* The layout is run for a fixed number of ticks (one per frame) and then frozen, so the
   simulation is bounded by frames rather than wall-clock: a hidden tab, where the browser
   freezes requestAnimationFrame, simply pauses it instead of stopping it before the forces
   ever applied. */
export const COOLDOWN_TICKS = 120

export const DEFAULT_BACKGROUND = '#04070d'
