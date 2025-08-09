import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable, attendanceTable, subjectsTable, gradesTable } from '../db/schema';
import { getStudentStatistics } from '../handlers/get_student_statistics';

describe('getStudentStatistics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty statistics when no data exists', async () => {
    const result = await getStudentStatistics();

    expect(result.total_students).toBe(0);
    expect(result.present_today).toBe(0);
    expect(result.absent_today).toBe(0);
    expect(result.late_today).toBe(0);
    expect(result.average_attendance_rate).toBe(0);
    expect(result.total_subjects).toBe(0);
    expect(result.average_grade_all_students).toBe(0);
  });

  it('should calculate statistics correctly with sample data', async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Create test students
    const studentsResult = await db.insert(studentsTable)
      .values([
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@test.com',
          phone: '123-456-7890',
          date_of_birth: '1990-01-01',
          enrollment_date: '2024-01-01'
        },
        {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@test.com',
          phone: '123-456-7891',
          date_of_birth: '1991-01-01',
          enrollment_date: '2024-01-01'
        },
        {
          first_name: 'Bob',
          last_name: 'Johnson',
          email: 'bob@test.com',
          phone: null,
          date_of_birth: '1992-01-01',
          enrollment_date: '2024-01-01'
        }
      ])
      .returning()
      .execute();

    // Create test subjects
    const subjectsResult = await db.insert(subjectsTable)
      .values([
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
        }
      ])
      .returning()
      .execute();

    // Create today's attendance records
    await db.insert(attendanceTable)
      .values([
        {
          student_id: studentsResult[0].id,
          date: today,
          status: 'present',
          reason: null
        },
        {
          student_id: studentsResult[1].id,
          date: today,
          status: 'late',
          reason: 'Traffic'
        },
        {
          student_id: studentsResult[2].id,
          date: today,
          status: 'absent',
          reason: 'Sick'
        }
      ])
      .execute();

    // Create historical attendance records for average calculation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    await db.insert(attendanceTable)
      .values([
        {
          student_id: studentsResult[0].id,
          date: yesterdayString,
          status: 'present',
          reason: null
        },
        {
          student_id: studentsResult[1].id,
          date: yesterdayString,
          status: 'present',
          reason: null
        },
        {
          student_id: studentsResult[2].id,
          date: yesterdayString,
          status: 'absent',
          reason: 'Personal'
        }
      ])
      .execute();

    // Create test grades
    await db.insert(gradesTable)
      .values([
        {
          student_id: studentsResult[0].id,
          subject_id: subjectsResult[0].id,
          grade: '85.50',
          grade_type: 'midterm',
          max_score: '100.00',
          comments: 'Good work',
          recorded_date: today
        },
        {
          student_id: studentsResult[1].id,
          subject_id: subjectsResult[0].id,
          grade: '92.75',
          grade_type: 'midterm',
          max_score: '100.00',
          comments: 'Excellent',
          recorded_date: today
        },
        {
          student_id: studentsResult[0].id,
          subject_id: subjectsResult[1].id,
          grade: '78.25',
          grade_type: 'assignment',
          max_score: '100.00',
          comments: null,
          recorded_date: today
        }
      ])
      .execute();

    const result = await getStudentStatistics();

    // Verify basic counts
    expect(result.total_students).toBe(3);
    expect(result.total_subjects).toBe(2);

    // Verify today's attendance
    expect(result.present_today).toBe(1);
    expect(result.absent_today).toBe(1);
    expect(result.late_today).toBe(1);

    // Verify average attendance rate
    // Total records: 6 (3 today + 3 yesterday)
    // Present/Late records: 4 (1 present + 1 late today, 2 present yesterday)
    // Rate: 4/6 * 100 = 66.67%
    expect(result.average_attendance_rate).toBe(66.67);

    // Verify average grade
    // Grades: 85.50, 92.75, 78.25
    // Average: (85.50 + 92.75 + 78.25) / 3 = 85.50
    expect(result.average_grade_all_students).toBe(85.5);
  });

  it('should handle edge case with no attendance records for today', async () => {
    // Create students and subjects but no today's attendance
    await db.insert(studentsTable)
      .values([
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@test.com',
          phone: '123-456-7890',
          date_of_birth: '1990-01-01',
          enrollment_date: '2024-01-01'
        }
      ])
      .execute();

    await db.insert(subjectsTable)
      .values([
        {
          name: 'Mathematics',
          code: 'MATH101',
          description: 'Basic Mathematics',
          credits: 3
        }
      ])
      .execute();

    const result = await getStudentStatistics();

    expect(result.total_students).toBe(1);
    expect(result.total_subjects).toBe(1);
    expect(result.present_today).toBe(0);
    expect(result.absent_today).toBe(0);
    expect(result.late_today).toBe(0);
    expect(result.average_attendance_rate).toBe(0);
    expect(result.average_grade_all_students).toBe(0);
  });

  it('should handle edge case with attendance but no grades', async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Create test data without grades
    const studentsResult = await db.insert(studentsTable)
      .values([
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@test.com',
          phone: '123-456-7890',
          date_of_birth: '1990-01-01',
          enrollment_date: '2024-01-01'
        }
      ])
      .returning()
      .execute();

    await db.insert(subjectsTable)
      .values([
        {
          name: 'Mathematics',
          code: 'MATH101',
          description: 'Basic Mathematics',
          credits: 3
        }
      ])
      .execute();

    await db.insert(attendanceTable)
      .values([
        {
          student_id: studentsResult[0].id,
          date: today,
          status: 'present',
          reason: null
        }
      ])
      .execute();

    const result = await getStudentStatistics();

    expect(result.total_students).toBe(1);
    expect(result.total_subjects).toBe(1);
    expect(result.present_today).toBe(1);
    expect(result.absent_today).toBe(0);
    expect(result.late_today).toBe(0);
    expect(result.average_attendance_rate).toBe(100);
    expect(result.average_grade_all_students).toBe(0);
  });

  it('should calculate attendance rate correctly with mixed statuses', async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    // Create students
    const studentsResult = await db.insert(studentsTable)
      .values([
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@test.com',
          phone: '123-456-7890',
          date_of_birth: '1990-01-01',
          enrollment_date: '2024-01-01'
        },
        {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@test.com',
          phone: '123-456-7891',
          date_of_birth: '1991-01-01',
          enrollment_date: '2024-01-01'
        }
      ])
      .returning()
      .execute();

    // Create attendance records with mixed statuses
    await db.insert(attendanceTable)
      .values([
        // Today: 1 present, 1 absent
        {
          student_id: studentsResult[0].id,
          date: today,
          status: 'present',
          reason: null
        },
        {
          student_id: studentsResult[1].id,
          date: today,
          status: 'absent',
          reason: 'Sick'
        },
        // Yesterday: 1 late, 1 absent  
        {
          student_id: studentsResult[0].id,
          date: yesterdayString,
          status: 'late',
          reason: 'Traffic'
        },
        {
          student_id: studentsResult[1].id,
          date: yesterdayString,
          status: 'absent',
          reason: 'Personal'
        }
      ])
      .execute();

    const result = await getStudentStatistics();

    // Total records: 4
    // Present/Late records: 2 (1 present today, 1 late yesterday)
    // Rate: 2/4 * 100 = 50%
    expect(result.average_attendance_rate).toBe(50);
    expect(result.present_today).toBe(1);
    expect(result.absent_today).toBe(1);
    expect(result.late_today).toBe(0);
  });

  it('should return proper numeric types', async () => {
    const result = await getStudentStatistics();

    expect(typeof result.total_students).toBe('number');
    expect(typeof result.present_today).toBe('number');
    expect(typeof result.absent_today).toBe('number');
    expect(typeof result.late_today).toBe('number');
    expect(typeof result.average_attendance_rate).toBe('number');
    expect(typeof result.total_subjects).toBe('number');
    expect(typeof result.average_grade_all_students).toBe('number');
  });
});