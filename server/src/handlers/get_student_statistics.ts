import { db } from '../db';
import { studentsTable, attendanceTable, subjectsTable, gradesTable } from '../db/schema';
import { count, avg, eq, sql } from 'drizzle-orm';

export interface StudentStatistics {
  total_students: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  average_attendance_rate: number;
  total_subjects: number;
  average_grade_all_students: number;
}

export const getStudentStatistics = async (): Promise<StudentStatistics> => {
  try {
    // Get today's date for attendance queries
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Query 1: Total students
    const totalStudentsResult = await db.select({ count: count() })
      .from(studentsTable)
      .execute();
    const total_students = totalStudentsResult[0]?.count || 0;

    // Query 2: Today's attendance breakdown
    const todayAttendanceResult = await db.select({
      status: attendanceTable.status,
      count: count()
    })
      .from(attendanceTable)
      .where(eq(attendanceTable.date, todayString))
      .groupBy(attendanceTable.status)
      .execute();

    // Initialize attendance counts
    let present_today = 0;
    let absent_today = 0;
    let late_today = 0;

    // Process attendance results
    todayAttendanceResult.forEach(result => {
      const statusCount = result.count;
      switch (result.status) {
        case 'present':
          present_today = statusCount;
          break;
        case 'absent':
          absent_today = statusCount;
          break;
        case 'late':
          late_today = statusCount;
          break;
      }
    });

    // Query 3: Average attendance rate (percentage of all attendance records that are 'present' or 'late')
    const attendanceStatsResult = await db.select({
      total_records: count(),
      present_and_late: sql<number>`COUNT(CASE WHEN ${attendanceTable.status} IN ('present', 'late') THEN 1 END)`
    })
      .from(attendanceTable)
      .execute();

    const attendanceStats = attendanceStatsResult[0];
    const average_attendance_rate = attendanceStats?.total_records > 0 
      ? (Number(attendanceStats.present_and_late) / attendanceStats.total_records) * 100
      : 0;

    // Query 4: Total subjects
    const totalSubjectsResult = await db.select({ count: count() })
      .from(subjectsTable)
      .execute();
    const total_subjects = totalSubjectsResult[0]?.count || 0;

    // Query 5: Average grade across all students
    const avgGradeResult = await db.select({
      avg_grade: avg(gradesTable.grade)
    })
      .from(gradesTable)
      .execute();

    const average_grade_all_students = avgGradeResult[0]?.avg_grade 
      ? parseFloat(avgGradeResult[0].avg_grade)
      : 0;

    return {
      total_students,
      present_today,
      absent_today,
      late_today,
      average_attendance_rate: Math.round(average_attendance_rate * 100) / 100, // Round to 2 decimal places
      total_subjects,
      average_grade_all_students: Math.round(average_grade_all_students * 100) / 100 // Round to 2 decimal places
    };
  } catch (error) {
    console.error('Failed to get student statistics:', error);
    throw error;
  }
};