import { db } from '../db';
import { studentsTable } from '../db/schema';
import { type UpdateStudentInput, type Student } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateStudent(input: UpdateStudentInput): Promise<Student> {
  try {
    // First check if student exists
    const existingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.id))
      .execute();

    if (existingStudent.length === 0) {
      throw new Error('Student not found');
    }

    // Build update object with only provided fields (properly typed for database)
    const updateData: any = {};
    
    if (input.first_name !== undefined) {
      updateData.first_name = input.first_name;
    }
    
    if (input.last_name !== undefined) {
      updateData.last_name = input.last_name;
    }
    
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    
    if (input.phone !== undefined) {
      updateData.phone = input.phone;
    }
    
    if (input.date_of_birth !== undefined) {
      // Convert Date to string for database storage
      updateData.date_of_birth = input.date_of_birth.toISOString().split('T')[0];
    }

    // If no fields to update, return existing student with proper date conversion
    if (Object.keys(updateData).length === 0) {
      const student = existingStudent[0];
      return {
        ...student,
        date_of_birth: new Date(student.date_of_birth),
        enrollment_date: new Date(student.enrollment_date),
        created_at: new Date(student.created_at)
      };
    }

    // Update student record
    const result = await db.update(studentsTable)
      .set(updateData)
      .where(eq(studentsTable.id, input.id))
      .returning()
      .execute();

    // Convert date strings back to Date objects for return
    const student = result[0];
    return {
      ...student,
      date_of_birth: new Date(student.date_of_birth),
      enrollment_date: new Date(student.enrollment_date),
      created_at: new Date(student.created_at)
    };
  } catch (error) {
    console.error('Student update failed:', error);
    throw error;
  }
}