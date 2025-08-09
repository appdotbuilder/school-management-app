import { db } from '../db';
import { studentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Student } from '../schema';

export async function getStudentById(id: number): Promise<Student | null> {
  try {
    // Query the database for the student by ID
    const results = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, id))
      .limit(1)
      .execute();

    // Return the student if found, null otherwise
    if (results.length === 0) {
      return null;
    }

    const student = results[0];
    
    // Convert date strings to Date objects to match schema expectations
    return {
      ...student,
      date_of_birth: new Date(student.date_of_birth),
      enrollment_date: new Date(student.enrollment_date)
    };
  } catch (error) {
    console.error('Get student by ID failed:', error);
    throw error;
  }
}