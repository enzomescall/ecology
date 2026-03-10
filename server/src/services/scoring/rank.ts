/** Rank players by value (descending). Players with 0 are excluded. Ties share averaged points. */
export function rankPlayers(values: Record<string, number>, points: number[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const pid of Object.keys(values)) result[pid] = 0;

  const eligible = Object.entries(values)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  let i = 0;
  while (i < eligible.length) {
    let j = i;
    while (j < eligible.length && eligible[j]![1] === eligible[i]![1]) j++;
    const tiedPts = points.slice(i, j);
    const avg = tiedPts.length ? tiedPts.reduce((a, b) => a + b, 0) / (j - i) : 0;
    for (let k = i; k < j; k++) result[eligible[k]![0]] = avg;
    i = j;
  }
  return result;
}
