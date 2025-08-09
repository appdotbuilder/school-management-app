import { db } from '../db';
import { studentsTable } from '../db/schema';
import { type CreateStudentInput, type Student } from '../schema';
import { eq } from 'drizzle-orm';

export const createStudent = async (input: CreateStudentInput): Promise<Student> => {
  try {
    // Check for duplicate email
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.email, input.email))
      .execute();

    if (existingStudent.length > 0) {
      throw new Error(`Student with email ${input.email} already exists`);
    }

    // Insert student record - convert dates to strings for PostgreSQL
    const insertData: typeof studentsTable.$inferInsert = {
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone,
      date_of_birth: input.date_of_birth.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      enrollment_date: input.enrollment_date?.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string if provided
    };

    const result = await db.insert(studentsTable)
      .values(insertData)
      .returning()
      .execute();

    // Convert date strings to Date objects for consistency with schema
    const student = result[0];
    return {
      ...student,
      date_of_birth: new Date(student.date_of_birth),
      enrollment_date: new Date(student.enrollment_date)
    };
  } catch (error) {
    console.error('Student creation failed:', error);
    throw error;
  }
};