import { db } from '../db';
import { studentsTable, attendanceTable, gradesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteStudent(id: number): Promise<{ success: boolean; message: string }> {
  try {
    // First, check if student exists
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .execute();

    if (existingStudent.length === 0) {
      return {
        success: false,
        message: 'Student not found'
      };
    }

    // Use transaction for cascading deletes to ensure data consistency
    await db.transaction(async (tx) => {
      // Delete attendance records first (child records)
      await tx.delete(attendanceTable)
        .where(eq(attendanceTable.student_id, id))
        .execute();

      // Delete grade records (child records)
      await tx.delete(gradesTable)
        .where(eq(gradesTable.student_id, id))
        .execute();

      // Finally delete the student record (parent record)
      await tx.delete(studentsTable)
        .where(eq(studentsTable.id, id))
        .execute();
    });

    return {
      success: true,
      message: `Student with ID ${id} and all related records deleted successfully`
    };
  } catch (error) {
    console.error('Student deletion failed:', error);
    throw error;
  }
}