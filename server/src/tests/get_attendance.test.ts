import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable, attendanceTable } from '../db/schema';
import { type GetAttendanceInput } from '../schema';
import { getAttendance } from '../handlers/get_attendance';

describe('getAttendance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get attendance records within date range', async () => {
    // Create test student
    const studentResult = await db.insert(studentsTable)
      .values({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        date_of_birth: '1995-01-01',
        enrollment_date: '2023-01-01'
      })
      .returning()
      .execute();

    const student = studentResult[0];

    // Create attendance records
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

    await db.insert(attendanceTable)
      .values([
        {
          student_id: student.id,
          date: yesterday.toISOString().split('T')[0],
          status: 'present',
          reason: null
        },
        {
          student_id: student.id,
          date: today.toISOString().split('T')[0],
          status: 'absent',
          reason: 'Sick'
        },
        {
          student_id: student.id,
          date: dayBeforeYesterday.toISOString().split('T')[0],
          status: 'late',
          reason: 'Traffic'
        }
      ])
      .execute();

    const input: GetAttendanceInput = {
      start_date: yesterday,
      end_date: today
    };

    const result = await getAttendance(input);

    // Should return 2 records within the date range
    expect(result).toHaveLength(2);
    expect(result[0].student_id).toEqual(student.id);
    expect(result[0].student_name).toEqual('John');
    expect(result[0].id).toBeDefined();
    expect(result[0].date).toBeInstanceOf(Date);
    expect(result[0].status).toMatch(/^(present|absent|late)$/);
    expect(result[0].created_at).toBeInstanceOf(Date);
    
    // Verify dates are within expected range (compare only the date parts, not times)
    result.forEach(record => {
      const recordDateStr = record.date.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      expect(recordDateStr >= yesterdayStr).toBe(true);
      expect(recordDateStr <= todayStr).toBe(true);
    });
  });

  it('should filter by specific student', async () => {
    // Create two test students
    const studentsResult = await db.insert(studentsTable)
      .values([
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          date_of_birth: '1995-01-01',
          enrollment_date: '2023-01-01'
        },
        {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          date_of_birth: '1996-02-02',
          enrollment_date: '2023-01-01'
        }
      ])
      .returning()
      .execute();

    const [student1, student2] = studentsResult;

    // Create attendance records for both students
    const today = new Date();
    await db.insert(attendanceTable)
      .values([
        {
          student_id: student1.id,
          date: today.toISOString().split('T')[0],
          status: 'present',
          reason: null
        },
        {
          student_id: student2.id,
          date: today.toISOString().split('T')[0],
          status: 'absent',
          reason: 'Sick'
        }
      ])
      .execute();

    const input: GetAttendanceInput = {
      student_id: student1.id,
      start_date: today,
      end_date: today
    };

    const result = await getAttendance(input);

    // Should return only student1's attendance
    expect(result).toHaveLength(1);
    expect(result[0].student_id).toEqual(student1.id);
    expect(result[0].student_name).toEqual('John');
    expect(result[0].status).toEqual('present');
  });

  it('should return all students when no student_id filter is provided', async () => {
    // Create two test students
    const studentsResult = await db.insert(studentsTable)
      .values([
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          date_of_birth: '1995-01-01',
          enrollment_date: '2023-01-01'
        },
        {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          date_of_birth: '1996-02-02',
          enrollment_date: '2023-01-01'
        }
      ])
      .returning()
      .execute();

    const [student1, student2] = studentsResult;

    // Create attendance records for both students
    const today = new Date();
    await db.insert(attendanceTable)
      .values([
        {
          student_id: student1.id,
          date: today.toISOString().split('T')[0],
          status: 'present',
          reason: null
        },
        {
          student_id: student2.id,
          date: today.toISOString().split('T')[0],
          status: 'absent',
          reason: 'Sick'
        }
      ])
      .execute();

    const input: GetAttendanceInput = {
      start_date: today,
      end_date: today
    };

    const result = await getAttendance(input);

    // Should return attendance for both students
    expect(result).toHaveLength(2);
    
    const student1Record = result.find(r => r.student_id === student1.id);
    const student2Record = result.find(r => r.student_id === student2.id);
    
    expect(student1Record).toBeDefined();
    expect(student1Record?.student_name).toEqual('John');
    expect(student1Record?.status).toEqual('present');
    
    expect(student2Record).toBeDefined();
    expect(student2Record?.student_name).toEqual('Jane');
    expect(student2Record?.status).toEqual('absent');
    expect(student2Record?.reason).toEqual('Sick');
  });

  it('should return empty array when no records found in date range', async () => {
    // Create test student
    const studentResult = await db.insert(studentsTable)
      .values({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        date_of_birth: '1995-01-01',
        enrollment_date: '2023-01-01'
      })
      .returning()
      .execute();

    const student = studentResult[0];

    // Create attendance record for today
    const today = new Date();
    await db.insert(attendanceTable)
      .values({
        student_id: student.id,
        date: today.toISOString().split('T')[0],
        status: 'present',
        reason: null
      })
      .execute();

    // Query for a different date range
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 10);
    const futureEndDate = new Date(today);
    futureEndDate.setDate(futureEndDate.getDate() + 20);

    const input: GetAttendanceInput = {
      start_date: futureDate,
      end_date: futureEndDate
    };

    const result = await getAttendance(input);

    expect(result).toHaveLength(0);
  });

  it('should handle different attendance statuses correctly', async () => {
    // Create test student
    const studentResult = await db.insert(studentsTable)
      .values({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        date_of_birth: '1995-01-01',
        enrollment_date: '2023-01-01'
      })
      .returning()
      .execute();

    const student = studentResult[0];

    // Create attendance records with different statuses
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);

    await db.insert(attendanceTable)
      .values([
        {
          student_id: student.id,
          date: dayBefore.toISOString().split('T')[0],
          status: 'present',
          reason: null
        },
        {
          student_id: student.id,
          date: yesterday.toISOString().split('T')[0],
          status: 'absent',
          reason: 'Medical appointment'
        },
        {
          student_id: student.id,
          date: today.toISOString().split('T')[0],
          status: 'late',
          reason: 'Public transport delay'
        }
      ])
      .execute();

    const input: GetAttendanceInput = {
      student_id: student.id,
      start_date: dayBefore,
      end_date: today
    };

    const result = await getAttendance(input);

    expect(result).toHaveLength(3);

    // Check each status type is properly returned
    const statuses = result.map(r => r.status).sort();
    expect(statuses).toEqual(['absent', 'late', 'present']);

    // Check that reasons are properly handled
    const absentRecord = result.find(r => r.status === 'absent');
    expect(absentRecord?.reason).toEqual('Medical appointment');

    const lateRecord = result.find(r => r.status === 'late');
    expect(lateRecord?.reason).toEqual('Public transport delay');

    const presentRecord = result.find(r => r.status === 'present');
    expect(presentRecord?.reason).toBeNull();
  });

  it('should return empty array when student_id does not exist', async () => {
    const today = new Date();
    
    const input: GetAttendanceInput = {
      student_id: 99999, // Non-existent student ID
      start_date: today,
      end_date: today
    };

    const result = await getAttendance(input);

    expect(result).toHaveLength(0);
  });
});