export function filterAndSortTeams(teams, standings = [], options = {}) {
  const search = String(options.search ?? '').trim().toLowerCase();
  const sort = options.sort ?? 'position';

  const standingMap = new Map(
    standings.map(row => [row.team?.publicId, row])
  );

  const filtered = teams.filter(team =>
    String(team.name ?? '').toLowerCase().includes(search)
  );

  return [...filtered].sort((a, b) => {
    const rowA = standingMap.get(a.publicId);
    const rowB = standingMap.get(b.publicId);

    if (sort === 'name') {
      return a.name.localeCompare(b.name);
    }

    if (sort === 'points') {
      return (rowB?.points ?? -1) - (rowA?.points ?? -1) ||
        a.name.localeCompare(b.name);
    }

    return (rowA?.position ?? Infinity) -
      (rowB?.position ?? Infinity) ||
      a.name.localeCompare(b.name);
  });
}
