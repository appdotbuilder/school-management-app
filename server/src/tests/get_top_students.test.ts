import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable, subjectsTable, gradesTable } from '../db/schema';
import { type GetTopStudentsInput } from '../schema';
import { getTopStudents } from '../handlers/get_top_students';

// Test data setup
const testStudents = [
  {
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'alice@example.com',
    phone: '123-456-7890',
    date_of_birth: '2000-01-15',
    enrollment_date: '2023-09-01'
  },
  {
    first_name: 'Bob',
    last_name: 'Smith',
    email: 'bob@example.com',
    phone: '234-567-8901',
    date_of_birth: '1999-05-20',
    enrollment_date: '2023-09-01'
  },
  {
    first_name: 'Charlie',
    last_name: 'Brown',
    email: 'charlie@example.com',
    phone: '345-678-9012',
    date_of_birth: '2001-03-10',
    enrollment_date: '2023-09-01'
  }
];

const testSubjects = [
  {
    name: 'Mathematics',
    code: 'MATH101',
    description: 'Basic Mathematics',
    credits: 3
  },
  {
    name: 'Physics',
    code: 'PHYS101',
    description: 'Basic Physics',
    credits: 4
  },
  {
    name: 'Chemistry',
    code: 'CHEM101',
    description: 'Basic Chemistry',
    credits: 3
  }
];

describe('getTopStudents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return top students with default limit of 10', async () => {
    // Create students
    const students = await db.insert(studentsTable).values(testStudents).returning().execute();
    
    // Create subjects
    const subjects = await db.insert(subjectsTable).values(testSubjects).returning().execute();
    
    // Create grades - Alice has highest average (90), Bob has middle (80), Charlie has lowest (70)
    await db.insert(gradesTable).values([
      // Alice's grades (average: 90)
      {
        student_id: students[0].id,
        subject_id: subjects[0].id,
        grade: '95.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      {
        student_id: students[0].id,
        subject_id: subjects[1].id,
        grade: '85.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      // Bob's grades (average: 80)
      {
        student_id: students[1].id,
        subject_id: subjects[0].id,
        grade: '80.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      {
        student_id: students[1].id,
        subject_id: subjects[1].id,
        grade: '80.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      // Charlie's grades (average: 70)
      {
        student_id: students[2].id,
        subject_id: subjects[0].id,
        grade: '70.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      {
        student_id: students[2].id,
        subject_id: subjects[1].id,
        grade: '70.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      }
    ]).execute();

    const result = await getTopStudents();

    expect(result).toHaveLength(3);
    
    // Check ranking order (highest average first)
    expect(result[0].first_name).toEqual('Alice');
    expect(result[0].rank).toEqual(1);
    expect(result[0].average_grade).toEqual(90);
    expect(result[0].total_subjects).toEqual(2);
    expect(typeof result[0].average_grade).toEqual('number');
    expect(typeof result[0].total_subjects).toEqual('number');
    
    expect(result[1].first_name).toEqual('Bob');
    expect(result[1].rank).toEqual(2);
    expect(result[1].average_grade).toEqual(80);
    
    expect(result[2].first_name).toEqual('Charlie');
    expect(result[2].rank).toEqual(3);
    expect(result[2].average_grade).toEqual(70);
  });

  it('should respect custom limit parameter', async () => {
    // Create students
    const students = await db.insert(studentsTable).values(testStudents).returning().execute();
    
    // Create subjects
    const subjects = await db.insert(subjectsTable).values(testSubjects).returning().execute();
    
    // Create grades for all students
    await db.insert(gradesTable).values([
      {
        student_id: students[0].id,
        subject_id: subjects[0].id,
        grade: '95.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      {
        student_id: students[1].id,
        subject_id: subjects[0].id,
        grade: '85.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      {
        student_id: students[2].id,
        subject_id: subjects[0].id,
        grade: '75.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      }
    ]).execute();

    const input: GetTopStudentsInput = { limit: 2 };
    const result = await getTopStudents(input);

    expect(result).toHaveLength(2);
    expect(result[0].first_name).toEqual('Alice');
    expect(result[1].first_name).toEqual('Bob');
  });

  it('should filter by grade type when specified', async () => {
    // Create students
    const students = await db.insert(studentsTable).values(testStudents).returning().execute();
    
    // Create subjects
    const subjects = await db.insert(subjectsTable).values(testSubjects).returning().execute();
    
    // Create mixed grade types - Alice has better midterm, Bob has better final
    await db.insert(gradesTable).values([
      // Alice's grades
      {
        student_id: students[0].id,
        subject_id: subjects[0].id,
        grade: '95.00',
        grade_type: 'midterm',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-10-01'
      },
      {
        student_id: students[0].id,
        subject_id: subjects[0].id,
        grade: '80.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      // Bob's grades
      {
        student_id: students[1].id,
        subject_id: subjects[0].id,
        grade: '75.00',
        grade_type: 'midterm',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-10-01'
      },
      {
        student_id: students[1].id,
        subject_id: subjects[0].id,
        grade: '90.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      }
    ]).execute();

    // Test filtering by midterm grades
    const midtermInput: GetTopStudentsInput = { grade_type: 'midterm' };
    const midtermResult = await getTopStudents(midtermInput);

    expect(midtermResult).toHaveLength(2);
    expect(midtermResult[0].first_name).toEqual('Alice'); // Higher midterm grade
    expect(midtermResult[0].average_grade).toEqual(95);
    expect(midtermResult[1].first_name).toEqual('Bob');
    expect(midtermResult[1].average_grade).toEqual(75);

    // Test filtering by final grades
    const finalInput: GetTopStudentsInput = { grade_type: 'final' };
    const finalResult = await getTopStudents(finalInput);

    expect(finalResult).toHaveLength(2);
    expect(finalResult[0].first_name).toEqual('Bob'); // Higher final grade
    expect(finalResult[0].average_grade).toEqual(90);
    expect(finalResult[1].first_name).toEqual('Alice');
    expect(finalResult[1].average_grade).toEqual(80);
  });

  it('should handle students with different numbers of subjects correctly', async () => {
    // Create students
    const students = await db.insert(studentsTable).values(testStudents).returning().execute();
    
    // Create subjects
    const subjects = await db.insert(subjectsTable).values(testSubjects).returning().execute();
    
    // Alice has grades in 3 subjects, Bob has grades in 2 subjects, Charlie has grades in 1 subject
    await db.insert(gradesTable).values([
      // Alice - 3 subjects (average: 85)
      {
        student_id: students[0].id,
        subject_id: subjects[0].id,
        grade: '90.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      {
        student_id: students[0].id,
        subject_id: subjects[1].id,
        grade: '80.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      {
        student_id: students[0].id,
        subject_id: subjects[2].id,
        grade: '85.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      // Bob - 2 subjects (average: 87.5)
      {
        student_id: students[1].id,
        subject_id: subjects[0].id,
        grade: '85.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      {
        student_id: students[1].id,
        subject_id: subjects[1].id,
        grade: '90.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      },
      // Charlie - 1 subject (average: 95)
      {
        student_id: students[2].id,
        subject_id: subjects[0].id,
        grade: '95.00',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      }
    ]).execute();

    const result = await getTopStudents();

    expect(result).toHaveLength(3);
    
    // Check that Charlie (highest average) is ranked first despite having fewer subjects
    expect(result[0].first_name).toEqual('Charlie');
    expect(result[0].average_grade).toEqual(95);
    expect(result[0].total_subjects).toEqual(1);
    
    expect(result[1].first_name).toEqual('Bob');
    expect(result[1].average_grade).toEqual(87.5);
    expect(result[1].total_subjects).toEqual(2);
    
    expect(result[2].first_name).toEqual('Alice');
    expect(result[2].average_grade).toEqual(85);
    expect(result[2].total_subjects).toEqual(3);
  });

  it('should return empty array when no students have grades', async () => {
    // Create students but no grades
    await db.insert(studentsTable).values(testStudents).returning().execute();
    
    const result = await getTopStudents();

    expect(result).toHaveLength(0);
  });

  it('should handle combined filters correctly', async () => {
    // Create students
    const students = await db.insert(studentsTable).values(testStudents).returning().execute();
    
    // Create subjects
    const subjects = await db.insert(subjectsTable).values(testSubjects).returning().execute();
    
    // Create various grades
    await db.insert(gradesTable).values([
      {
        student_id: students[0].id,
        subject_id: subjects[0].id,
        grade: '95.00',
        grade_type: 'assignment',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-11-01'
      },
      {
        student_id: students[1].id,
        subject_id: subjects[0].id,
        grade: '90.00',
        grade_type: 'assignment',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-11-01'
      },
      {
        student_id: students[2].id,
        subject_id: subjects[0].id,
        grade: '85.00',
        grade_type: 'assignment',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-11-01'
      }
    ]).execute();

    const input: GetTopStudentsInput = {
      limit: 2,
      grade_type: 'assignment'
    };
    
    const result = await getTopStudents(input);

    expect(result).toHaveLength(2);
    expect(result[0].first_name).toEqual('Alice');
    expect(result[0].rank).toEqual(1);
    expect(result[1].first_name).toEqual('Bob');
    expect(result[1].rank).toEqual(2);
  });

  it('should include all required fields in response', async () => {
    // Create student
    const students = await db.insert(studentsTable).values([testStudents[0]]).returning().execute();
    
    // Create subject
    const subjects = await db.insert(subjectsTable).values([testSubjects[0]]).returning().execute();
    
    // Create grade
    await db.insert(gradesTable).values([
      {
        student_id: students[0].id,
        subject_id: subjects[0].id,
        grade: '88.50',
        grade_type: 'final',
        max_score: '100.00',
        comments: null,
        recorded_date: '2023-12-01'
      }
    ]).execute();

    const result = await getTopStudents({ limit: 1 });

    expect(result).toHaveLength(1);
    const student = result[0];
    
    expect(student.id).toBeDefined();
    expect(typeof student.id).toEqual('number');
    expect(student.first_name).toEqual('Alice');
    expect(student.last_name).toEqual('Johnson');
    expect(student.email).toEqual('alice@example.com');
    expect(student.average_grade).toEqual(88.5);
    expect(typeof student.average_grade).toEqual('number');
    expect(student.total_subjects).toEqual(1);
    expect(typeof student.total_subjects).toEqual('number');
    expect(student.rank).toEqual(1);
    expect(typeof student.rank).toEqual('number');
  });
});