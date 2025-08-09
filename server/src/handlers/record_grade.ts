import { db } from '../db';
import { gradesTable, studentsTable, subjectsTable } from '../db/schema';
import { type RecordGradeInput, type Grade } from '../schema';
import { eq } from 'drizzle-orm';

export async function recordGrade(input: RecordGradeInput): Promise<Grade> {
  try {
    // Validate that the student exists
    const student = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.student_id))
      .execute();

    if (student.length === 0) {
      throw new Error(`Student with ID ${input.student_id} does not exist`);
    }

    // Validate that the subject exists
    const subject = await db.select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, input.subject_id))
      .execute();

    if (subject.length === 0) {
      throw new Error(`Subject with ID ${input.subject_id} does not exist`);
    }

    // Insert the grade record - convert numeric fields to strings and date to string
    const recordedDate = input.recorded_date || new Date();
    const result = await db.insert(gradesTable)
      .values({
        student_id: input.student_id,
        subject_id: input.subject_id,
        grade: input.grade.toString(), // Convert number to string for numeric column
        grade_type: input.grade_type,
        max_score: input.max_score.toString(), // Convert number to string for numeric column
        comments: input.comments || null,
        recorded_date: recordedDate.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers and date strings back to Date objects
    const grade = result[0];
    return {
      ...grade,
      grade: parseFloat(grade.grade), // Convert string back to number
      max_score: parseFloat(grade.max_score), // Convert string back to number
      recorded_date: new Date(grade.recorded_date), // Convert date string back to Date object
      created_at: new Date(grade.created_at) // Convert timestamp string back to Date object
    };
  } catch (error) {
    console.error('Grade recording failed:', error);
    throw error;
  }
}