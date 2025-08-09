import { db } from '../db';
import { gradesTable, studentsTable, subjectsTable } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { type GradeWithDetails } from '../schema';

export async function getGrades(studentId?: number): Promise<GradeWithDetails[]> {
  try {
    // Build query conditionally based on whether studentId is provided
    const baseQuery = db.select({
      id: gradesTable.id,
      student_id: gradesTable.student_id,
      student_first_name: studentsTable.first_name,
      student_last_name: studentsTable.last_name,
      subject_id: gradesTable.subject_id,
      subject_name: subjectsTable.name,
      subject_code: subjectsTable.code,
      grade: gradesTable.grade,
      grade_type: gradesTable.grade_type,
      max_score: gradesTable.max_score,
      comments: gradesTable.comments,
      recorded_date: gradesTable.recorded_date,
      created_at: gradesTable.created_at
    })
    .from(gradesTable)
    .innerJoin(studentsTable, eq(gradesTable.student_id, studentsTable.id))
    .innerJoin(subjectsTable, eq(gradesTable.subject_id, subjectsTable.id));

    // Execute query conditionally
    const results = studentId !== undefined
      ? await baseQuery.where(eq(gradesTable.student_id, studentId)).execute()
      : await baseQuery.execute();

    // Convert numeric fields, handle date conversion, and calculate percentage
    return results.map(result => ({
      id: result.id,
      student_id: result.student_id,
      student_name: `${result.student_first_name} ${result.student_last_name}`,
      subject_id: result.subject_id,
      subject_name: result.subject_name,
      subject_code: result.subject_code,
      grade: parseFloat(result.grade),
      grade_type: result.grade_type,
      max_score: parseFloat(result.max_score),
      percentage: (parseFloat(result.grade) / parseFloat(result.max_score)) * 100,
      comments: result.comments,
      recorded_date: new Date(result.recorded_date),
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch grades:', error);
    throw error;
  }
}