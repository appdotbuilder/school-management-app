import { db } from '../db';
import { studentsTable } from '../db/schema';
import { type Student } from '../schema';

export const getStudents = async (): Promise<Student[]> => {
  try {
    // Fetch all students from the database
    const results = await db.select()
      .from(studentsTable)
      .execute();

    // Convert date strings to Date objects to match schema
    return results.map(student => ({
      ...student,
      date_of_birth: new Date(student.date_of_birth),
      enrollment_date: new Date(student.enrollment_date)
    }));
  } catch (error) {
    console.error('Failed to fetch students:', error);
    throw error;
  }
};