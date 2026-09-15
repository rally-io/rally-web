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

/* Cyan and violet, NOT lime and pale blue. The felt is lime, so lime arcs disappear into the
   ball — and it is worse than it looks, because computeAmbientPool leaves opponent links out
   unless showRivals, so at rest EVERY moving arc was partner-coloured, i.e. the one colour that
   blends. Cyan is brand-adjacent and reads on both the felt and the blue coins; violet is
   roughly complementary to lime and is unmistakable next to cyan when a pinned player's
   partners and rivals radiate together. */
export const PARTNER_RGB: readonly [number, number, number] = [0.15, 0.75, 1.0]
export const RIVAL_RGB: readonly [number, number, number] = [0.85, 0.45, 1.0]

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
   4.3 + 0.25/partner portrait, i.e. players keep ~40% of a portrait clear around them. On its
   own this is only a FLOOR — it stops portraits overlapping each other, and because the sprite
   is a portrait plus its glow margin (NODE_PORTRAIT_FRACTION), 40% was never enough: at every
   realistic population the resulting gap came out SMALLER than the sprite, so faces piled into
   each other and the arcs between neighbours ran underneath them. */
export const NODE_COLLIDE_RATIO = 1.4
/* The real spacing rule: spread players as evenly as the ball's surface allows. Each of N
   players owns 4*PI*R^2/N of the shell, a patch of radius 2R/sqrt(N); this is the fraction of
   that patch a player keeps clear, so separation follows the population on its own — a quiet
   ball breathes, a busy one packs in — instead of following the portrait size. The collide
   radius is the LARGER of this and the ratio above, so neither rule can be violated: up to a
   few hundred players this one governs, past that the ball is genuinely full and the
   no-overlap floor takes back over. At 0.62 the gap comfortably clears the sprite (27.5 vs
   22.5 world units at 119 players) while using only ~39% of the sphere, so the layout still
   settles; much above 0.7 and collide starts fighting the radial force. */
export const NODE_SPACING_FILL = 0.62
/* How far apart the link force WANTS two connected players to sit, and how hard it insists.
   It used to pull them together (distance 30), so partners ended up as neighbours — which
   reads as clusters, but makes every arc a short hop between two touching portraits, hidden
   under their own glow. The mean chord between two random points on this shell is about
   4R/3 = 161, so asking for ~150 means partnership stops deciding WHERE a player sits: pairs
   land wherever the even-spacing rule puts them and their arcs stride across the ball. Long
   chords also lift higher (ARC_LIFT_K, capped at ARC_LIFT_MAX), so they bow clear of the felt
   instead of skimming it. Kept weak, so spacing and the shell still win. */
export const LINK_DISTANCE = 150
export const LINK_STRENGTH = 0.03
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
/* Resting traffic on the OPPONENT links, which the ambient pool deliberately leaves out (see
   computeAmbientPool). Without this the ball only ever tells half its story: matches against
   someone are ~90% of the network, but nothing violet moves until a player is pinned, so the
   two arc colours never appear together. Kept deliberately sparse — 8 slots over ~440 links
   means any one rivalry lights maybe once a minute, which is "distant traffic", not a second
   conversation competing with the partnerships. Do NOT get this by turning showRivals on: that
   folds 436 opponent links into the same weighted picker as 48 partner ones and the ball goes
   violet. Raise toward AMBIENT_PULSES to make rivalries the story instead. */
export const AMBIENT_RIVAL_PULSES = 8
export const AMBIENT_RIVAL_AMP = 0.6 // dimmer than partner traffic: context, not the headline
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
/* Where the camera sits when a player is pinned, as a FRACTION of the distance that frames the
   whole ball, so the dolly-in means the same thing whatever shape the stage is. It used to be a
   fixed 340, which is ~0.75 of the fit on a wide desktop stage but only ~0.57 on a portrait
   phone — there it drove the camera into the ball, with the pinned player's own arcs running
   off screen. The dolly is the weakest of the focus cues anyway: the ball turning to face the
   player, their arcs going solid and everyone else dimming carry it. */
export const FOCUS_FILL = 0.9
export const FOCUS_MS = 900
export const FIT_MS = 800
export const FIT_PADDING_PX = 40
/* How much of the fitted frame the ball may fill, applied ONLY when the width is the binding
   axis. On a portrait stage the ring of players is wider than tall in the frame and the ring is
   round, so pushing past an exact fit crops empty space at the sides rather than any player —
   and a ball that merely fits a phone's width reads as a small object in a lot of nothing. When
   the HEIGHT binds (any landscape stage) there is no such slack: overfilling would cut the ball
   off top and bottom, so it is not applied there. */
export const FIT_FILL = 1.14
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
