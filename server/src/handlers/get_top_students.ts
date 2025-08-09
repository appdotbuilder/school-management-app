import { db } from '../db';
import { studentsTable, gradesTable } from '../db/schema';
import { type GetTopStudentsInput, type StudentRanking } from '../schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getTopStudents(input: GetTopStudentsInput = {}): Promise<StudentRanking[]> {
  try {
    const limit = input.limit || 10;
    
    // Build the base query with all required clauses, using conditional where
    const baseQuery = db.select({
      id: studentsTable.id,
      first_name: studentsTable.first_name,
      last_name: studentsTable.last_name,
      email: studentsTable.email,
      average_grade: sql<string>`AVG(${gradesTable.grade})`.as('average_grade'),
      total_subjects: sql<string>`COUNT(DISTINCT ${gradesTable.subject_id})`.as('total_subjects')
    })
    .from(studentsTable)
    .innerJoin(gradesTable, eq(studentsTable.id, gradesTable.student_id));
    
    // Create the complete query with all clauses
    const query = input.grade_type 
      ? baseQuery
          .where(eq(gradesTable.grade_type, input.grade_type))
          .groupBy(studentsTable.id, studentsTable.first_name, studentsTable.last_name, studentsTable.email)
          .orderBy(desc(sql`AVG(${gradesTable.grade})`))
          .limit(limit)
      : baseQuery
          .groupBy(studentsTable.id, studentsTable.first_name, studentsTable.last_name, studentsTable.email)
          .orderBy(desc(sql`AVG(${gradesTable.grade})`))
          .limit(limit);
    
    const results = await query.execute();
    
    // Convert numeric fields and add ranking
    return results.map((result, index) => ({
      id: result.id,
      first_name: result.first_name,
      last_name: result.last_name,
      email: result.email,
      average_grade: parseFloat(result.average_grade), // Convert numeric to number
      total_subjects: parseInt(result.total_subjects), // Convert count to number
      rank: index + 1 // Assign rank based on position in sorted results
    }));
  } catch (error) {
    console.error('Get top students failed:', error);
    throw error;
  }
}