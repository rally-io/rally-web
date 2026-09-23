import {
  AdditiveBlending, Color, DirectionalLight, Mesh, MeshPhysicalMaterial, ShaderMaterial, SphereGeometry,
  SRGBColorSpace, TextureLoader, type Object3D, type Texture,
} from 'three'
import {
  BALL_TEXTURE_URL, CORE_RADIUS, FUR_HEIGHT, FUR_SHELLS, FUR_TIP_LIGHT, GLOW_COLOR, INNER_GAIN, LIMB_GAIN,
  LOGO_LID_DIM, LOGO_RIM_COLOR, LOGO_SPOTS,
} from '../constants'
import { padelBallTextures } from '../lib/ballTextures'
import { buildLogoPlate, discShape, logoLidTexture, logoMask } from '../lib/logoCoin'

export interface BallBuild {
  /** everything that turns with the ball: felt, fur shells, logo coins, inner glow */
  objects: Object3D[]
  dispose(): void
}

interface Disposable {
  dispose(): void
}

/** The procedural padel ball. Felt with a photographic or noise grain, the real single-curve
    seam, fur shells, two Rally logo coins bent onto the sphere, and a delicate inner light. */
export function buildBall(logoImg: HTMLImageElement | null, feltImg: HTMLImageElement | null): BallBuild {
  const objects: Object3D[] = []
  const disposables: Disposable[] = []

  /* Felt: MeshPhysicalMaterial's sheen IS the cloth/velvet model — it is what gives the limb
     that fuzzy brightening a real felt ball has. Bump from the same noise gives the surface
     grain under the key light. */
  const mask = logoImg ? logoMask() : null
  let map: Texture
  let bump: Texture | null = null
  let fur: Texture | null = null
  if (BALL_TEXTURE_URL) {
    map = new TextureLoader().load(BALL_TEXTURE_URL)
    map.colorSpace = SRGBColorSpace
  } else {
    ;({ map, bump, fur } = padelBallTextures(mask, feltImg))
  }
  const ballMat = new MeshPhysicalMaterial({
    map,
    bumpMap: bump,
    bumpScale: bump ? 1.4 : 0,
    roughness: 0.92,
    metalness: 0,
    sheen: 0.6,
    sheenRoughness: 0.75,
    sheenColor: new Color(0xd6ee74),
  })
  const ballGeo = new SphereGeometry(CORE_RADIUS, 96, 64)
  const ball = new Mesh(ballGeo, ballMat)
  ball.receiveShadow = true
  objects.push(ball)
  disposables.push(ballGeo, ballMat, map)
  if (bump) disposables.push(bump)

  /* Fur shells. Opaque with an alpha test, so they write depth like the ball and need no
     sorting; sprites ignore depth and arcs sit well outside FUR_HEIGHT, so neither is
     affected. They receive the coins' shadow so the fuzz darkens under them too. */
  if (fur) {
    disposables.push(fur)
    for (let i = 1; i <= FUR_SHELLS; i++) {
      const t = i / FUR_SHELLS
      const shellMat = new MeshPhysicalMaterial({
        map,
        alphaMap: fur,
        alphaTest: i / (FUR_SHELLS + 1),
        roughness: 1,
        metalness: 0,
        color: new Color().setScalar(1 + (FUR_TIP_LIGHT - 1) * t),
      })
      const shellGeo = new SphereGeometry(CORE_RADIUS + FUR_HEIGHT * t, 96, 64)
      const shell = new Mesh(shellGeo, shellMat)
      shell.receiveShadow = true
      objects.push(shell)
      disposables.push(shellGeo, shellMat)
    }
  }

  /* The logo coins: real geometry, bent onto the sphere just above the felt. Glossy top with
     the icon artwork, darker blue rim; they cast the key light's shadow onto the felt. */
  if (mask && logoImg) {
    const shapes = [discShape(mask)]
    const lidTex = logoLidTexture(logoImg, mask.S)
    const topMat = new MeshPhysicalMaterial({
      map: lidTex,
      color: LOGO_LID_DIM,
      roughness: 0.38,
      metalness: 0,
      clearcoat: 0.7,
      clearcoatRoughness: 0.3,
    })
    const wallMat = new MeshPhysicalMaterial({ color: LOGO_RIM_COLOR, roughness: 0.55, metalness: 0 })
    disposables.push(lidTex, topMat, wallMat)
    for (const spot of LOGO_SPOTS) {
      const plateGeo = buildLogoPlate(mask, shapes, spot)
      const plate = new Mesh(plateGeo, [topMat, wallMat])
      plate.castShadow = true
      plate.receiveShadow = true
      objects.push(plate)
      disposables.push(plateGeo)
    }
  }

  /* Inner light on the ball surface itself. Front side, additive, sitting just above the
     felt: brightest where the surface faces the camera (the lamp-in-a-frosted-ball look),
     plus a faint limb so the edge softens instead of cutting. The felt stays visible under
     it because the gain is low — this is meant to be delicate, not shiny. Nothing is drawn
     outside the silhouette: no halo sprite, no atmosphere shell. */
  const innerMat = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(GLOW_COLOR) },
      uInner: { value: INNER_GAIN },
      uLimb: { value: LIMB_GAIN },
    },
    vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uInner;
        uniform float uLimb;
        varying vec3 vNormal;
        void main() {
          float nz = clamp(vNormal.z, 0.0, 1.0);
          float inner = pow(nz, 1.6) * uInner;
          float limb = pow(1.0 - nz, 3.0) * uLimb;
          gl_FragColor = vec4(uColor * (inner + limb), 1.0);
        }`,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  })
  const limbGeo = new SphereGeometry(CORE_RADIUS * 1.004, 64, 48)
  const limb = new Mesh(limbGeo, innerMat)
  objects.push(limb)
  disposables.push(limbGeo, innerMat)

  return {
    objects,
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}

/* Key light, upper front-left OF THE VIEW: parented to the camera so the highlight stays
   put while the ball auto-rotates (a world-fixed light swings its hotspot round the back
   every half turn). The camera must be in the scene graph for a child light to work. The
   offset is LARGE on purpose: a directional light's direction runs from its position to
   its target (the origin), so a small offset next to a camera 500 units out is a headlight
   — flat, no relief. Sprites and the arc ribbons are unlit, so this touches the ball and
   the plates only. It also casts the plates' shadow onto the felt. */
export function buildKeyLight(): DirectionalLight {
  const key = new DirectionalLight(0xfff3d8, 1.3)
  key.position.set(-420, 520, 380)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  const sc = key.shadow.camera
  sc.left = -(CORE_RADIUS + 30)
  sc.right = CORE_RADIUS + 30
  sc.top = CORE_RADIUS + 30
  sc.bottom = -(CORE_RADIUS + 30)
  sc.near = 1
  sc.far = 5000
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.6
  return key
}
