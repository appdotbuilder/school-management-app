import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { gradesTable, studentsTable, subjectsTable } from '../db/schema';
import { type RecordGradeInput } from '../schema';
import { recordGrade } from '../handlers/record_grade';
import { eq } from 'drizzle-orm';

describe('recordGrade', () => {
  let studentId: number;
  let subjectId: number;

  beforeEach(async () => {
    await createDB();

    // Create test student
    const studentResult = await db.insert(studentsTable)
      .values({
        first_name: 'Test',
        last_name: 'Student',
        email: 'test@example.com',
        phone: null,
        date_of_birth: '2000-01-01', // Use string format for date field
        enrollment_date: new Date().toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();
    
    studentId = studentResult[0].id;

    // Create test subject
    const subjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics',
        credits: 3
      })
      .returning()
      .execute();
    
    subjectId = subjectResult[0].id;
  });

  afterEach(resetDB);

  it('should record a grade successfully', async () => {
    const testInput: RecordGradeInput = {
      student_id: studentId,
      subject_id: subjectId,
      grade: 85.5,
      grade_type: 'midterm',
      max_score: 100,
      comments: 'Good performance',
      recorded_date: new Date('2024-01-15')
    };

    const result = await recordGrade(testInput);

    // Verify basic fields
    expect(result.student_id).toEqual(studentId);
    expect(result.subject_id).toEqual(subjectId);
    expect(result.grade).toEqual(85.5);
    expect(typeof result.grade).toEqual('number');
    expect(result.grade_type).toEqual('midterm');
    expect(result.max_score).toEqual(100);
    expect(typeof result.max_score).toEqual('number');
    expect(result.comments).toEqual('Good performance');
    expect(result.recorded_date).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should record grade without optional fields', async () => {
    const testInput: RecordGradeInput = {
      student_id: studentId,
      subject_id: subjectId,
      grade: 92.0,
      grade_type: 'final',
      max_score: 100,
      comments: null
      // recorded_date is optional and should default
    };

    const result = await recordGrade(testInput);

    expect(result.student_id).toEqual(studentId);
    expect(result.subject_id).toEqual(subjectId);
    expect(result.grade).toEqual(92.0);
    expect(result.grade_type).toEqual('final');
    expect(result.max_score).toEqual(100);
    expect(result.comments).toBeNull();
    expect(result.recorded_date).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
  });

  it('should save grade to database correctly', async () => {
    const testInput: RecordGradeInput = {
      student_id: studentId,
      subject_id: subjectId,
      grade: 78.25,
      grade_type: 'assignment',
      max_score: 80,
      comments: 'Well done',
      recorded_date: new Date('2024-02-01')
    };

    const result = await recordGrade(testInput);

    // Query the database to verify the record was saved
    const grades = await db.select()
      .from(gradesTable)
      .where(eq(gradesTable.id, result.id))
      .execute();

    expect(grades).toHaveLength(1);
    const savedGrade = grades[0];
    
    expect(savedGrade.student_id).toEqual(studentId);
    expect(savedGrade.subject_id).toEqual(subjectId);
    expect(parseFloat(savedGrade.grade)).toEqual(78.25); // Verify numeric conversion
    expect(savedGrade.grade_type).toEqual('assignment');
    expect(parseFloat(savedGrade.max_score)).toEqual(80); // Verify numeric conversion
    expect(savedGrade.comments).toEqual('Well done');
    expect(savedGrade.recorded_date).toEqual('2024-02-01'); // Database stores as string
    expect(savedGrade.created_at).toBeInstanceOf(Date);
  });

  it('should handle different grade types', async () => {
    const gradeTypes: Array<'midterm' | 'final' | 'assignment' | 'quiz'> = 
      ['midterm', 'final', 'assignment', 'quiz'];

    for (const gradeType of gradeTypes) {
      const testInput: RecordGradeInput = {
        student_id: studentId,
        subject_id: subjectId,
        grade: 88.0,
        grade_type: gradeType,
        max_score: 100,
        comments: `Test ${gradeType} grade`
      };

      const result = await recordGrade(testInput);
      expect(result.grade_type).toEqual(gradeType);
      expect(result.comments).toEqual(`Test ${gradeType} grade`);
    }
  });

  it('should handle decimal grades correctly', async () => {
    const testInput: RecordGradeInput = {
      student_id: studentId,
      subject_id: subjectId,
      grade: 87.75,
      grade_type: 'quiz',
      max_score: 90.5,
      comments: null
    };

    const result = await recordGrade(testInput);

    expect(result.grade).toEqual(87.75);
    expect(result.max_score).toEqual(90.5);
    expect(typeof result.grade).toEqual('number');
    expect(typeof result.max_score).toEqual('number');
  });

  it('should throw error when student does not exist', async () => {
    const testInput: RecordGradeInput = {
      student_id: 999999, // Non-existent student
      subject_id: subjectId,
      grade: 85.0,
      grade_type: 'midterm',
      max_score: 100,
      comments: null
    };

    await expect(recordGrade(testInput)).rejects.toThrow(/student with id 999999 does not exist/i);
  });

  it('should throw error when subject does not exist', async () => {
    const testInput: RecordGradeInput = {
      student_id: studentId,
      subject_id: 999999, // Non-existent subject
      grade: 85.0,
      grade_type: 'midterm',
      max_score: 100,
      comments: null
    };

    await expect(recordGrade(testInput)).rejects.toThrow(/subject with id 999999 does not exist/i);
  });

  it('should record multiple grades for same student-subject combination', async () => {
    // First grade
    const firstInput: RecordGradeInput = {
      student_id: studentId,
      subject_id: subjectId,
      grade: 80.0,
      grade_type: 'midterm',
      max_score: 100,
      comments: 'Midterm exam'
    };

    // Second grade
    const secondInput: RecordGradeInput = {
      student_id: studentId,
      subject_id: subjectId,
      grade: 90.0,
      grade_type: 'final',
      max_score: 100,
      comments: 'Final exam'
    };

    const firstResult = await recordGrade(firstInput);
    const secondResult = await recordGrade(secondInput);

    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.grade_type).toEqual('midterm');
    expect(secondResult.grade_type).toEqual('final');

    // Verify both records exist in database
    const allGrades = await db.select()
      .from(gradesTable)
      .where(eq(gradesTable.student_id, studentId))
      .execute();

    expect(allGrades).toHaveLength(2);
  });
});