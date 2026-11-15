/** "1 second", "45 seconds", "15 minutes", "14 minutes 32 seconds". Rounds up so the player is never told too little. */
export function formatWait(ms: number): string {
  const total = Math.max(1, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (minutes === 0) return unit(seconds, 'second');
  return seconds === 0 ? unit(minutes, 'minute') : `${unit(minutes, 'minute')} ${unit(seconds, 'second')}`;
}
