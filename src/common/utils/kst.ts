const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKstIso(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString();
}

/** KST 기준 날짜 (YYYY-MM-DD) */
export function kstDate(date: Date = new Date()): string {
  return toKstIso(date).slice(0, 10);
}

/** KST 기준 시각 (HH:mm:ss) */
export function kstTime(date: Date = new Date()): string {
  return toKstIso(date).slice(11, 19);
}

/** TIME 컬럼 값(HH:mm:ss)을 응답용 HH:mm 으로 변환 */
export function toHourMinute(time: string | null | undefined): string | null {
  return time ? time.slice(0, 5) : null;
}
