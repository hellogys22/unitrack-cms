export const SEMESTER_CREDIT_CAP = 24;
export const ATTENDANCE_THRESHOLD_PERCENT = 75;
export const MAX_INTERNAL_MARKS = 30;

export interface AttendanceStats {
  presentSessions: number;
  totalSessions: number;
  percentage: number | null;
  exactPercentage: number | null;
  isLowAttendance: boolean;
}

export function calculateAttendanceStats(
  records: ReadonlyArray<{ status: "PRESENT" | "ABSENT" }>
): AttendanceStats {
  const totalSessions = records.length;
  const presentSessions = records.filter((r) => r.status === "PRESENT").length;

  if (totalSessions === 0) {
    return {
      presentSessions: 0,
      totalSessions: 0,
      percentage: null,
      exactPercentage: null,
      isLowAttendance: false,
    };
  }

  const exactPercentage = (presentSessions / totalSessions) * 100;
  const percentage = Math.round(exactPercentage);
  const isLowAttendance = exactPercentage < ATTENDANCE_THRESHOLD_PERCENT;

  return {
    presentSessions,
    totalSessions,
    percentage,
    exactPercentage,
    isLowAttendance,
  };
}

export function normalizeSessionDate(dateInput: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return null;
  }
  const parsed = new Date(`${dateInput}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}
