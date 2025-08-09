import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable, attendanceTable, gradesTable, subjectsTable } from '../db/schema';
import { deleteStudent } from '../handlers/delete_student';
import { eq } from 'drizzle-orm';

describe('deleteStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return error when student does not exist', async () => {
    const result = await deleteStudent(999);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Student not found');
  });

  it('should delete student successfully when no related records exist', async () => {
    // Create a test student
    const studentResult = await db.insert(studentsTable)
      .values({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: null,
        date_of_birth: '1995-05-15',
        enrollment_date: '2024-01-15'
      })
      .returning()
      .execute();

    const studentId = studentResult[0].id;

    // Delete the student
    const result = await deleteStudent(studentId);

    // Verify success response
    expect(result.success).toBe(true);
    expect(result.message).toBe(`Student with ID ${studentId} and all related records deleted successfully`);

    // Verify student is actually deleted
    const remainingStudents = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, studentId))
      .execute();

    expect(remainingStudents).toHaveLength(0);
  });

  it('should cascade delete all related attendance and grade records', async () => {
    // Create prerequisites
    const studentResult = await db.insert(studentsTable)
      .values({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        phone: '555-0123',
        date_of_birth: '1998-03-20',
        enrollment_date: '2024-01-15'
      })
      .returning()
      .execute();

    const subjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics',
        credits: 3
      })
      .returning()
      .execute();

    const studentId = studentResult[0].id;
    const subjectId = subjectResult[0].id;

    // Create attendance records
    await db.insert(attendanceTable)
      .values([
        {
          student_id: studentId,
          date: '2024-01-15',
          status: 'present',
          reason: null
        },
        {
          student_id: studentId,
          date: '2024-01-16',
          status: 'absent',
          reason: 'Sick'
        }
      ])
      .execute();

    // Create grade records
    await db.insert(gradesTable)
      .values([
        {
          student_id: studentId,
          subject_id: subjectId,
          grade: '85.50',
          grade_type: 'midterm',
          max_score: '100.00',
          comments: 'Good performance',
          recorded_date: '2024-02-01'
        },
        {
          student_id: studentId,
          subject_id: subjectId,
          grade: '92.25',
          grade_type: 'final',
          max_score: '100.00',
          comments: 'Excellent work',
          recorded_date: '2024-03-01'
        }
      ])
      .execute();

    // Verify records exist before deletion
    const attendanceBefore = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.student_id, studentId))
      .execute();

    const gradesBefore = await db.select()
      .from(gradesTable)
      .where(eq(gradesTable.student_id, studentId))
      .execute();

    expect(attendanceBefore).toHaveLength(2);
    expect(gradesBefore).toHaveLength(2);

    // Delete the student
    const result = await deleteStudent(studentId);

    // Verify success
    expect(result.success).toBe(true);
    expect(result.message).toBe(`Student with ID ${studentId} and all related records deleted successfully`);

    // Verify student is deleted
    const remainingStudents = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, studentId))
      .execute();

    expect(remainingStudents).toHaveLength(0);

    // Verify all attendance records are deleted
    const remainingAttendance = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.student_id, studentId))
      .execute();

    expect(remainingAttendance).toHaveLength(0);

    // Verify all grade records are deleted
    const remainingGrades = await db.select()
      .from(gradesTable)
      .where(eq(gradesTable.student_id, studentId))
      .execute();

    expect(remainingGrades).toHaveLength(0);

    // Verify subject remains intact (should not be deleted)
    const remainingSubjects = await db.select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, subjectId))
      .execute();

    expect(remainingSubjects).toHaveLength(1);
  });

  it('should only delete records for the specified student', async () => {
    // Create two students
    const student1Result = await db.insert(studentsTable)
      .values({
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice.johnson@example.com',
        phone: null,
        date_of_birth: '1997-07-10',
        enrollment_date: '2024-01-15'
      })
      .returning()
      .execute();

    const student2Result = await db.insert(studentsTable)
      .values({
        first_name: 'Bob',
        last_name: 'Wilson',
        email: 'bob.wilson@example.com',
        phone: '555-0456',
        date_of_birth: '1996-11-25',
        enrollment_date: '2024-01-15'
      })
      .returning()
      .execute();

    const subjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Physics',
        code: 'PHYS101',
        description: 'Basic Physics',
        credits: 4
      })
      .returning()
      .execute();

    const student1Id = student1Result[0].id;
    const student2Id = student2Result[0].id;
    const subjectId = subjectResult[0].id;

    // Create attendance for both students
    await db.insert(attendanceTable)
      .values([
        {
          student_id: student1Id,
          date: '2024-01-15',
          status: 'present',
          reason: null
        },
        {
          student_id: student2Id,
          date: '2024-01-15',
          status: 'absent',
          reason: 'Personal'
        }
      ])
      .execute();

    // Create grades for both students
    await db.insert(gradesTable)
      .values([
        {
          student_id: student1Id,
          subject_id: subjectId,
          grade: '78.00',
          grade_type: 'quiz',
          max_score: '100.00',
          comments: null,
          recorded_date: '2024-02-01'
        },
        {
          student_id: student2Id,
          subject_id: subjectId,
          grade: '88.50',
          grade_type: 'quiz',
          max_score: '100.00',
          comments: 'Well done',
          recorded_date: '2024-02-01'
        }
      ])
      .execute();

    // Delete only student1
    const result = await deleteStudent(student1Id);

    expect(result.success).toBe(true);

    // Verify student1 is deleted
    const student1Records = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, student1Id))
      .execute();

    expect(student1Records).toHaveLength(0);

    // Verify student2 still exists
    const student2Records = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, student2Id))
      .execute();

    expect(student2Records).toHaveLength(1);

    // Verify student1's records are deleted
    const student1Attendance = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.student_id, student1Id))
      .execute();

    const student1Grades = await db.select()
      .from(gradesTable)
      .where(eq(gradesTable.student_id, student1Id))
      .execute();

    expect(student1Attendance).toHaveLength(0);
    expect(student1Grades).toHaveLength(0);

    // Verify student2's records remain
    const student2Attendance = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.student_id, student2Id))
      .execute();

    const student2Grades = await db.select()
      .from(gradesTable)
      .where(eq(gradesTable.student_id, student2Id))
      .execute();

    expect(student2Attendance).toHaveLength(1);
    expect(student2Grades).toHaveLength(1);
  });

  it('should handle deletion of student with large number of related records', async () => {
    // Create student
    const studentResult = await db.insert(studentsTable)
      .values({
        first_name: 'Test',
        last_name: 'Student',
        email: 'test.student@example.com',
        phone: null,
        date_of_birth: '1999-01-01',
        enrollment_date: '2024-01-15'
      })
      .returning()
      .execute();

    const subjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Computer Science',
        code: 'CS101',
        description: 'Introduction to Programming',
        credits: 3
      })
      .returning()
      .execute();

    const studentId = studentResult[0].id;
    const subjectId = subjectResult[0].id;

    // Create multiple attendance records
    const attendanceData = [];
    for (let i = 1; i <= 30; i++) {
      attendanceData.push({
        student_id: studentId,
        date: `2024-01-${i.toString().padStart(2, '0')}`,
        status: i % 3 === 0 ? 'absent' : 'present' as 'absent' | 'present',
        reason: i % 3 === 0 ? 'Various reasons' : null
      });
    }

    await db.insert(attendanceTable)
      .values(attendanceData)
      .execute();

    // Create multiple grade records
    const gradeData = [];
    const gradeTypes = ['midterm', 'final', 'assignment', 'quiz'] as const;
    for (let i = 1; i <= 20; i++) {
      gradeData.push({
        student_id: studentId,
        subject_id: subjectId,
        grade: (75 + (i % 25)).toString(),
        grade_type: gradeTypes[i % 4],
        max_score: '100.00',
        comments: i % 5 === 0 ? `Comment for grade ${i}` : null,
        recorded_date: `2024-02-${(i % 28 + 1).toString().padStart(2, '0')}`
      });
    }

    await db.insert(gradesTable)
      .values(gradeData)
      .execute();

    // Verify records exist
    const attendanceCount = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.student_id, studentId))
      .execute();

    const gradesCount = await db.select()
      .from(gradesTable)
      .where(eq(gradesTable.student_id, studentId))
      .execute();

    expect(attendanceCount).toHaveLength(30);
    expect(gradesCount).toHaveLength(20);

    // Delete student
    const result = await deleteStudent(studentId);

    expect(result.success).toBe(true);

    // Verify all records are deleted
    const remainingStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, studentId))
      .execute();

    const remainingAttendance = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.student_id, studentId))
      .execute();

    const remainingGrades = await db.select()
      .from(gradesTable)
      .where(eq(gradesTable.student_id, studentId))
      .execute();

    expect(remainingStudent).toHaveLength(0);
    expect(remainingAttendance).toHaveLength(0);
    expect(remainingGrades).toHaveLength(0);
  });
});