export function filterPlayers(players, options = {}) {
  const search = String(options.search ?? '').trim().toLowerCase();
  const position = String(options.position ?? 'all').toLowerCase();

  return players.filter(player => {
    const name = String(
      player.name ?? player.fullName ?? ''
    ).toLowerCase();

    const team = String(
      player.team?.name ?? player.teamName ?? ''
    ).toLowerCase();

    const playerPosition = String(
      player.position ?? ''
    ).toLowerCase();

    const matchesSearch =
      !search || name.includes(search) || team.includes(search);

    const matchesPosition =
      position === 'all' || playerPosition === position;

    return matchesSearch && matchesPosition;
  });
}
