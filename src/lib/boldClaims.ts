export function generateXArray(playerCount: number): number[] {
  const arr: number[] = [];

  if (playerCount === 3) {
    for (let i = 0; i < 10; i++) arr.push(Math.random() < 0.5 ? 1 : 2);
    return arr;
  }

  if (playerCount === 4) {
    for (let i = 0; i < 10; i++) arr.push(1 + Math.floor(Math.random() * 3));
    return arr;
  }

  // 5+ players: one `1`, one `playerCount - 1`, eight from middle range
  const upper = playerCount - 1;
  const middleMin = 2;
  const middleMax =
    playerCount <= 7
      ? playerCount - 2 // 5–7: 2 to playerCount-2
      : Math.floor(playerCount / 2); // 8+: 2 to floor(playerCount/2)

  arr.push(1);
  arr.push(upper);
  for (let i = 0; i < 8; i++) {
    arr.push(middleMin + Math.floor(Math.random() * (middleMax - middleMin + 1)));
  }

  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
