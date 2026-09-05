/**
 * Name helpers shared by every league surface that renders a player.
 *
 * A separate module rather than exports beside a component: a value export next
 * to a component trips `react-refresh/only-export-components`, and both
 * `PlayerIdentity` (rows) and `HeroShields` (the shield wall) need these.
 */

export type PlayerNameSource = {
  first_name?: string | null;
  last_name?: string | null;
};

export function playerFullName(player: PlayerNameSource): string {
  return [player.first_name, player.last_name].filter(Boolean).join(' ').trim();
}

export function playerInitials(player: PlayerNameSource): string {
  const letters = [player.first_name, player.last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .map(part => part.trim()[0]?.toUpperCase() ?? '')
    .join('');
  return letters || '?';
}
