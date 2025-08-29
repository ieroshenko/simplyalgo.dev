export function formatTimeAgo(input: string | number | Date): string {
  const ts = typeof input === "number" ? input : new Date(input).getTime();
  let seconds = Math.round((Date.now() - ts) / 1000);
  const future = seconds < 0;
  seconds = Math.abs(seconds);

  const units: Array<[limit: number, size: number, suffix: string]> = [
    [60, 1, "s"],
    [3600, 60, "m"],
    [86400, 3600, "h"],
    [604800, 86400, "d"],
    [2629800, 604800, "w"],
    [31557600, 2629800, "mo"],
    [Infinity, 31557600, "y"],
  ];

  for (const [limit, size, suf] of units) {
    if (seconds < limit) {
      const n = Math.max(1, Math.floor(seconds / size));
      return future ? `in ${n}${suf}` : `${n}${suf}`;
    }
  }

  return future ? "in 0s" : "0s";
}


