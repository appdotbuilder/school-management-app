import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable } from '../db/schema';
import { getStudentById } from '../handlers/get_student_by_id';
import { eq } from 'drizzle-orm';

// Test student data
const testStudent = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  date_of_birth: '1995-05-15',
  enrollment_date: '2023-09-01'
};

const testStudentNoPhone = {
  first_name: 'Jane',
  last_name: 'Smith', 
  email: 'jane.smith@example.com',
  phone: null, // Nullable field
  date_of_birth: '1996-08-20',
  enrollment_date: '2023-09-01'
};

describe('getStudentById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return student when found', async () => {
    // Insert test student
    const insertResult = await db.insert(studentsTable)
      .values(testStudent)
      .returning()
      .execute();

    const createdStudent = insertResult[0];

    // Test getting the student by ID
    const result = await getStudentById(createdStudent.id);

    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdStudent.id);
    expect(result!.first_name).toEqual('John');
    expect(result!.last_name).toEqual('Doe');
    expect(result!.email).toEqual('john.doe@example.com');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.date_of_birth).toBeInstanceOf(Date);
    expect(result!.enrollment_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when student not found', async () => {
    // Test with non-existent ID
    const result = await getStudentById(999);

    expect(result).toBeNull();
  });

  it('should handle student with nullable phone field', async () => {
    // Insert student with null phone
    const insertResult = await db.insert(studentsTable)
      .values(testStudentNoPhone)
      .returning()
      .execute();

    const createdStudent = insertResult[0];

    // Test getting the student
    const result = await getStudentById(createdStudent.id);

    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result!.first_name).toEqual('Jane');
    expect(result!.last_name).toEqual('Smith');
    expect(result!.phone).toBeNull();
  });

  it('should return correct student when multiple students exist', async () => {
    // Insert multiple students
    const student1 = await db.insert(studentsTable)
      .values(testStudent)
      .returning()
      .execute();

    const student2 = await db.insert(studentsTable)
      .values({
        ...testStudentNoPhone,
        email: 'unique@example.com' // Ensure unique email
      })
      .returning()
      .execute();

    // Test getting specific student
    const result = await getStudentById(student2[0].id);

    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(student2[0].id);
    expect(result!.first_name).toEqual('Jane');
    expect(result!.email).toEqual('unique@example.com');
    expect(result!.id).not.toEqual(student1[0].id);
  });

  it('should verify student is actually stored in database', async () => {
    // Insert test student
    const insertResult = await db.insert(studentsTable)
      .values(testStudent)
      .returning()
      .execute();

    const createdStudent = insertResult[0];

    // Get student using handler
    const handlerResult = await getStudentById(createdStudent.id);

    // Verify by querying database directly
    const directQuery = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, createdStudent.id))
      .execute();

    expect(handlerResult).toBeDefined();
    expect(directQuery).toHaveLength(1);
    expect(handlerResult!.id).toEqual(directQuery[0].id);
    expect(handlerResult!.first_name).toEqual(directQuery[0].first_name);
    expect(handlerResult!.email).toEqual(directQuery[0].email);
  });

  it('should handle date fields correctly', async () => {
    // Insert student with specific dates
    const specificDateStudent = {
      first_name: 'Date',
      last_name: 'Test',
      email: 'date.test@example.com',
      phone: null,
      date_of_birth: '1990-01-01',
      enrollment_date: '2020-09-15'
    };

    const insertResult = await db.insert(studentsTable)
      .values(specificDateStudent)
      .returning()
      .execute();

    const createdStudent = insertResult[0];

    // Get student and verify dates
    const result = await getStudentById(createdStudent.id);

    expect(result).toBeDefined();
    expect(result!.date_of_birth).toBeInstanceOf(Date);
    expect(result!.enrollment_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);

    // Verify date values
    const birthDate = new Date('1990-01-01');
    const enrollmentDate = new Date('2020-09-15');
    
    expect(result!.date_of_birth.getTime()).toEqual(birthDate.getTime());
    expect(result!.enrollment_date.getTime()).toEqual(enrollmentDate.getTime());
  });
});