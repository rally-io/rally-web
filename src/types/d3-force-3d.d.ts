/* d3-force-3d ships no type declarations. This declares only the surface the player globe
   uses — the 3D variants of the d3-force API (nodes carry z / vz, forces take a z). */
declare module 'd3-force-3d' {
  export interface SimulationNodeDatum {
    index?: number
    x?: number
    y?: number
    z?: number
    vx?: number
    vy?: number
    vz?: number
    fx?: number | null
    fy?: number | null
    fz?: number | null
  }

  export interface SimulationLinkDatum<N extends SimulationNodeDatum> {
    source: N | string | number
    target: N | string | number
    index?: number
  }

  export interface Force<N extends SimulationNodeDatum> {
    (alpha: number): void
    initialize?(nodes: N[], random: () => number, numDimensions: number): void
  }

  export interface Simulation<N extends SimulationNodeDatum> {
    restart(): this
    stop(): this
    tick(iterations?: number): this
    nodes(): N[]
    nodes(nodes: N[]): this
    alpha(): number
    alpha(alpha: number): this
    alphaMin(): number
    alphaMin(min: number): this
    alphaDecay(): number
    alphaDecay(decay: number): this
    alphaTarget(): number
    alphaTarget(target: number): this
    velocityDecay(): number
    velocityDecay(decay: number): this
    numDimensions(): number
    numDimensions(n: number): this
    force(name: string): Force<N> | undefined
    force(name: string, force: Force<N> | null): this
  }

  export function forceSimulation<N extends SimulationNodeDatum>(nodes?: N[], numDimensions?: number): Simulation<N>

  export interface ForceLink<N extends SimulationNodeDatum, L extends SimulationLinkDatum<N>> extends Force<N> {
    links(): L[]
    links(links: L[]): this
    id(id: (node: N, i: number, nodes: N[]) => string | number): this
    distance(distance: number | ((link: L, i: number, links: L[]) => number)): this
    strength(strength: number | ((link: L, i: number, links: L[]) => number)): this
    iterations(iterations: number): this
  }
  export function forceLink<N extends SimulationNodeDatum, L extends SimulationLinkDatum<N>>(links?: L[]): ForceLink<N, L>

  export interface ForceManyBody<N extends SimulationNodeDatum> extends Force<N> {
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): this
    distanceMin(distance: number): this
    distanceMax(distance: number): this
    theta(theta: number): this
  }
  export function forceManyBody<N extends SimulationNodeDatum>(): ForceManyBody<N>

  export interface ForceCenter<N extends SimulationNodeDatum> extends Force<N> {
    x(x: number): this
    y(y: number): this
    z(z: number): this
    strength(strength: number): this
  }
  export function forceCenter<N extends SimulationNodeDatum>(x?: number, y?: number, z?: number): ForceCenter<N>

  export interface ForceRadial<N extends SimulationNodeDatum> extends Force<N> {
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): this
    radius(radius: number | ((node: N, i: number, nodes: N[]) => number)): this
    x(x: number): this
    y(y: number): this
    z(z: number): this
  }
  export function forceRadial<N extends SimulationNodeDatum>(
    radius: number | ((node: N, i: number, nodes: N[]) => number),
    x?: number,
    y?: number,
    z?: number,
  ): ForceRadial<N>

  export interface ForceCollide<N extends SimulationNodeDatum> extends Force<N> {
    radius(radius: number | ((node: N, i: number, nodes: N[]) => number)): this
    strength(strength: number): this
    iterations(iterations: number): this
  }
  export function forceCollide<N extends SimulationNodeDatum>(
    radius?: number | ((node: N, i: number, nodes: N[]) => number),
  ): ForceCollide<N>
}
