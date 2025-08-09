import { db } from '../db';
import { studentsTable, attendanceTable } from '../db/schema';
import { type RecordAttendanceInput, type Attendance } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function recordAttendance(input: RecordAttendanceInput): Promise<Attendance> {
  try {
    // First, validate that the student exists
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.student_id))
      .execute();

    if (existingStudent.length === 0) {
      throw new Error(`Student with ID ${input.student_id} does not exist`);
    }

    // Format date as string for database comparison (date columns are stored as strings)
    const dateString = input.date.toISOString().split('T')[0];

    // Check for duplicate attendance record for the same student and date
    const existingAttendance = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.student_id, input.student_id),
        eq(attendanceTable.date, dateString)
      ))
      .execute();

    if (existingAttendance.length > 0) {
      throw new Error(`Attendance record already exists for student ${input.student_id} on ${dateString}`);
    }

    // Insert the attendance record
    const result = await db.insert(attendanceTable)
      .values({
        student_id: input.student_id,
        date: dateString,
        status: input.status,
        reason: input.reason
      })
      .returning()
      .execute();

    const attendanceRecord = result[0];
    
    return {
      id: attendanceRecord.id,
      student_id: attendanceRecord.student_id,
      date: new Date(attendanceRecord.date), // Convert string back to Date
      status: attendanceRecord.status,
      reason: attendanceRecord.reason,
      created_at: attendanceRecord.created_at
    };
  } catch (error) {
    console.error('Attendance recording failed:', error);
    throw error;
  }
}