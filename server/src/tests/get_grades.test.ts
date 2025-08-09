import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable, subjectsTable, gradesTable } from '../db/schema';
import { getGrades } from '../handlers/get_grades';
import { eq } from 'drizzle-orm';

describe('getGrades', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testStudent = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    date_of_birth: '1998-05-15',
    enrollment_date: '2022-09-01'
  };

  const testStudent2 = {
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '987-654-3210',
    date_of_birth: '1999-03-20',
    enrollment_date: '2022-09-01'
  };

  const testSubject = {
    name: 'Mathematics',
    code: 'MATH101',
    description: 'Basic Mathematics',
    credits: 3
  };

  const testSubject2 = {
    name: 'Physics',
    code: 'PHYS101',
    description: 'Basic Physics',
    credits: 4
  };

  it('should return empty array when no grades exist', async () => {
    const result = await getGrades();
    expect(result).toEqual([]);
  });

  it('should return all grades with student and subject details', async () => {
    // Create test data
    const [student] = await db.insert(studentsTable).values(testStudent).returning().execute();
    const [subject] = await db.insert(subjectsTable).values(testSubject).returning().execute();
    
    const testGrade = {
      student_id: student.id,
      subject_id: subject.id,
      grade: '85.50',
      grade_type: 'midterm' as const,
      max_score: '100.00',
      comments: 'Good performance',
      recorded_date: '2023-10-15'
    };

    await db.insert(gradesTable).values(testGrade).returning().execute();

    const result = await getGrades();

    expect(result).toHaveLength(1);
    expect(result[0].student_id).toEqual(student.id);
    expect(result[0].student_name).toEqual('John Doe');
    expect(result[0].subject_id).toEqual(subject.id);
    expect(result[0].subject_name).toEqual('Mathematics');
    expect(result[0].subject_code).toEqual('MATH101');
    expect(result[0].grade).toEqual(85.50);
    expect(typeof result[0].grade).toBe('number');
    expect(result[0].grade_type).toEqual('midterm');
    expect(result[0].max_score).toEqual(100.00);
    expect(typeof result[0].max_score).toBe('number');
    expect(result[0].percentage).toEqual(85.50);
    expect(result[0].comments).toEqual('Good performance');
    expect(result[0].recorded_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter grades by student ID when provided', async () => {
    // Create test data
    const [student1] = await db.insert(studentsTable).values(testStudent).returning().execute();
    const [student2] = await db.insert(studentsTable).values(testStudent2).returning().execute();
    const [subject] = await db.insert(subjectsTable).values(testSubject).returning().execute();
    
    const grade1 = {
      student_id: student1.id,
      subject_id: subject.id,
      grade: '85.50',
      grade_type: 'midterm' as const,
      max_score: '100.00',
      comments: 'Student 1 grade',
      recorded_date: '2023-10-15'
    };

    const grade2 = {
      student_id: student2.id,
      subject_id: subject.id,
      grade: '92.00',
      grade_type: 'final' as const,
      max_score: '100.00',
      comments: 'Student 2 grade',
      recorded_date: '2023-10-16'
    };

    await db.insert(gradesTable).values([grade1, grade2]).execute();

    // Test filtering by student 1
    const result1 = await getGrades(student1.id);
    expect(result1).toHaveLength(1);
    expect(result1[0].student_id).toEqual(student1.id);
    expect(result1[0].student_name).toEqual('John Doe');
    expect(result1[0].comments).toEqual('Student 1 grade');

    // Test filtering by student 2
    const result2 = await getGrades(student2.id);
    expect(result2).toHaveLength(1);
    expect(result2[0].student_id).toEqual(student2.id);
    expect(result2[0].student_name).toEqual('Jane Smith');
    expect(result2[0].comments).toEqual('Student 2 grade');

    // Test getting all grades
    const allResults = await getGrades();
    expect(allResults).toHaveLength(2);
  });

  it('should handle multiple grades for the same student', async () => {
    // Create test data
    const [student] = await db.insert(studentsTable).values(testStudent).returning().execute();
    const [subject1] = await db.insert(subjectsTable).values(testSubject).returning().execute();
    const [subject2] = await db.insert(subjectsTable).values(testSubject2).returning().execute();
    
    const grades = [
      {
        student_id: student.id,
        subject_id: subject1.id,
        grade: '85.50',
        grade_type: 'midterm' as const,
        max_score: '100.00',
        comments: 'Math midterm',
        recorded_date: '2023-10-15'
      },
      {
        student_id: student.id,
        subject_id: subject2.id,
        grade: '78.75',
        grade_type: 'assignment' as const,
        max_score: '90.00',
        comments: 'Physics assignment',
        recorded_date: '2023-10-20'
      }
    ];

    await db.insert(gradesTable).values(grades).execute();

    const result = await getGrades(student.id);

    expect(result).toHaveLength(2);
    
    // Check both grades are present with correct details
    const mathGrade = result.find(g => g.subject_code === 'MATH101');
    const physicsGrade = result.find(g => g.subject_code === 'PHYS101');

    expect(mathGrade).toBeDefined();
    expect(mathGrade!.grade).toEqual(85.50);
    expect(mathGrade!.max_score).toEqual(100.00);
    expect(mathGrade!.percentage).toEqual(85.50);
    expect(mathGrade!.grade_type).toEqual('midterm');

    expect(physicsGrade).toBeDefined();
    expect(physicsGrade!.grade).toEqual(78.75);
    expect(physicsGrade!.max_score).toEqual(90.00);
    expect(physicsGrade!.percentage).toEqual(87.5); // 78.75/90 * 100
    expect(physicsGrade!.grade_type).toEqual('assignment');
  });

  it('should return empty array for non-existent student', async () => {
    // Create some test data for other students
    const [student] = await db.insert(studentsTable).values(testStudent).returning().execute();
    const [subject] = await db.insert(subjectsTable).values(testSubject).returning().execute();
    
    await db.insert(gradesTable).values({
      student_id: student.id,
      subject_id: subject.id,
      grade: '85.50',
      grade_type: 'midterm' as const,
      max_score: '100.00',
      comments: null,
      recorded_date: '2023-10-15'
    }).execute();

    // Query for non-existent student
    const result = await getGrades(99999);
    expect(result).toEqual([]);
  });

  it('should handle grades with null comments', async () => {
    // Create test data
    const [student] = await db.insert(studentsTable).values(testStudent).returning().execute();
    const [subject] = await db.insert(subjectsTable).values(testSubject).returning().execute();
    
    const testGrade = {
      student_id: student.id,
      subject_id: subject.id,
      grade: '95.00',
      grade_type: 'quiz' as const,
      max_score: '100.00',
      comments: null,
      recorded_date: '2023-10-15'
    };

    await db.insert(gradesTable).values(testGrade).execute();

    const result = await getGrades();

    expect(result).toHaveLength(1);
    expect(result[0].comments).toBeNull();
    expect(result[0].grade).toEqual(95.00);
    expect(result[0].percentage).toEqual(95.00);
  });

  it('should calculate percentage correctly for various scores', async () => {
    // Create test data
    const [student] = await db.insert(studentsTable).values(testStudent).returning().execute();
    const [subject] = await db.insert(subjectsTable).values(testSubject).returning().execute();
    
    const testGrades = [
      {
        student_id: student.id,
        subject_id: subject.id,
        grade: '45.00',
        grade_type: 'quiz' as const,
        max_score: '50.00',
        comments: '90% score',
        recorded_date: '2023-10-15'
      },
      {
        student_id: student.id,
        subject_id: subject.id,
        grade: '67.50',
        grade_type: 'assignment' as const,
        max_score: '75.00',
        comments: '90% score',
        recorded_date: '2023-10-16'
      }
    ];

    await db.insert(gradesTable).values(testGrades).execute();

    const result = await getGrades(student.id);

    expect(result).toHaveLength(2);
    
    // Check percentage calculations
    const quizGrade = result.find(g => g.grade_type === 'quiz');
    const assignmentGrade = result.find(g => g.grade_type === 'assignment');

    expect(quizGrade!.percentage).toEqual(90.0); // 45/50 * 100
    expect(assignmentGrade!.percentage).toEqual(90.0); // 67.5/75 * 100
  });
});