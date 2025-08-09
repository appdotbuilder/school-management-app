import { db } from '../db';
import { attendanceTable, studentsTable } from '../db/schema';
import { type GetAttendanceInput, type AttendanceWithStudent } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export const getAttendance = async (input: GetAttendanceInput): Promise<AttendanceWithStudent[]> => {
  try {
    // Start with base query
    let query = db.select({
      id: attendanceTable.id,
      student_id: attendanceTable.student_id,
      student_name: studentsTable.first_name,
      date: attendanceTable.date,
      status: attendanceTable.status,
      reason: attendanceTable.reason,
      created_at: attendanceTable.created_at
    })
    .from(attendanceTable)
    .innerJoin(studentsTable, eq(attendanceTable.student_id, studentsTable.id));

    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Convert dates to ISO string format for comparison (YYYY-MM-DD)
    const startDateStr = input.start_date.toISOString().split('T')[0];
    const endDateStr = input.end_date.toISOString().split('T')[0];

    // Apply date range filters (required)
    conditions.push(gte(attendanceTable.date, startDateStr));
    conditions.push(lte(attendanceTable.date, endDateStr));

    // Apply optional student filter
    if (input.student_id !== undefined) {
      conditions.push(eq(attendanceTable.student_id, input.student_id));
    }

    // Apply where conditions
    const finalQuery = query.where(and(...conditions));

    // Execute the query
    const results = await finalQuery.execute();

    // Transform the results to match the expected schema with Date objects
    return results.map(result => ({
      id: result.id,
      student_id: result.student_id,
      student_name: result.student_name,
      date: new Date(result.date), // Convert string date to Date object
      status: result.status,
      reason: result.reason,
      created_at: result.created_at // This is already a Date from timestamp column
    }));
  } catch (error) {
    console.error('Get attendance failed:', error);
    throw error;
  }
};