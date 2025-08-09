import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable } from '../db/schema';
import { type UpdateStudentInput, type CreateStudentInput } from '../schema';
import { updateStudent } from '../handlers/update_student';
import { eq } from 'drizzle-orm';

// Helper function to create a test student
const createTestStudent = async (): Promise<number> => {
  const studentData = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    date_of_birth: '1995-05-15', // Store as string for database
    enrollment_date: '2023-01-15' // Store as string for database
  };

  const result = await db.insert(studentsTable)
    .values(studentData)
    .returning()
    .execute();

  return result[0].id;
};

describe('updateStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update student first name', async () => {
    const studentId = await createTestStudent();
    
    const updateInput: UpdateStudentInput = {
      id: studentId,
      first_name: 'Jane'
    };

    const result = await updateStudent(updateInput);

    expect(result.id).toEqual(studentId);
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Doe'); // Should remain unchanged
    expect(result.email).toEqual('john.doe@example.com'); // Should remain unchanged
  });

  it('should update student last name', async () => {
    const studentId = await createTestStudent();
    
    const updateInput: UpdateStudentInput = {
      id: studentId,
      last_name: 'Smith'
    };

    const result = await updateStudent(updateInput);

    expect(result.id).toEqual(studentId);
    expect(result.first_name).toEqual('John'); // Should remain unchanged
    expect(result.last_name).toEqual('Smith');
    expect(result.email).toEqual('john.doe@example.com'); // Should remain unchanged
  });

  it('should update student email', async () => {
    const studentId = await createTestStudent();
    
    const updateInput: UpdateStudentInput = {
      id: studentId,
      email: 'jane.smith@example.com'
    };

    const result = await updateStudent(updateInput);

    expect(result.id).toEqual(studentId);
    expect(result.first_name).toEqual('John'); // Should remain unchanged
    expect(result.last_name).toEqual('Doe'); // Should remain unchanged
    expect(result.email).toEqual('jane.smith@example.com');
  });

  it('should update student phone', async () => {
    const studentId = await createTestStudent();
    
    const updateInput: UpdateStudentInput = {
      id: studentId,
      phone: '+9876543210'
    };

    const result = await updateStudent(updateInput);

    expect(result.id).toEqual(studentId);
    expect(result.phone).toEqual('+9876543210');
    expect(result.email).toEqual('john.doe@example.com'); // Should remain unchanged
  });

  it('should set phone to null', async () => {
    const studentId = await createTestStudent();
    
    const updateInput: UpdateStudentInput = {
      id: studentId,
      phone: null
    };

    const result = await updateStudent(updateInput);

    expect(result.id).toEqual(studentId);
    expect(result.phone).toBeNull();
    expect(result.email).toEqual('john.doe@example.com'); // Should remain unchanged
  });

  it('should update student date of birth', async () => {
    const studentId = await createTestStudent();
    const newDateOfBirth = new Date('1990-12-25');
    
    const updateInput: UpdateStudentInput = {
      id: studentId,
      date_of_birth: newDateOfBirth
    };

    const result = await updateStudent(updateInput);

    expect(result.id).toEqual(studentId);
    expect(result.date_of_birth).toEqual(newDateOfBirth);
    expect(result.email).toEqual('john.doe@example.com'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const studentId = await createTestStudent();
    const newDateOfBirth = new Date('1992-08-10');
    
    const updateInput: UpdateStudentInput = {
      id: studentId,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+9876543210',
      date_of_birth: newDateOfBirth
    };

    const result = await updateStudent(updateInput);

    expect(result.id).toEqual(studentId);
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.phone).toEqual('+9876543210');
    expect(result.date_of_birth).toEqual(newDateOfBirth);
  });

  it('should save updated student to database', async () => {
    const studentId = await createTestStudent();
    
    const updateInput: UpdateStudentInput = {
      id: studentId,
      first_name: 'Jane',
      email: 'jane.doe@example.com'
    };

    await updateStudent(updateInput);

    // Verify changes were persisted to database
    const students = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, studentId))
      .execute();

    expect(students).toHaveLength(1);
    expect(students[0].first_name).toEqual('Jane');
    expect(students[0].email).toEqual('jane.doe@example.com');
    expect(students[0].last_name).toEqual('Doe'); // Should remain unchanged
  });

  it('should return unchanged student when no update fields provided', async () => {
    const studentId = await createTestStudent();
    
    const updateInput: UpdateStudentInput = {
      id: studentId
    };

    const result = await updateStudent(updateInput);

    expect(result.id).toEqual(studentId);
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.phone).toEqual('+1234567890');
    expect(result.date_of_birth).toEqual(new Date('1995-05-15'));
  });

  it('should throw error when student not found', async () => {
    const updateInput: UpdateStudentInput = {
      id: 99999, // Non-existent ID
      first_name: 'Jane'
    };

    await expect(updateStudent(updateInput)).rejects.toThrow(/student not found/i);
  });

  it('should throw error when trying to update to duplicate email', async () => {
    // Create first student
    const student1Id = await createTestStudent();
    
    // Create second student
    const student2Data = {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+9876543210',
      date_of_birth: '1996-03-20', // Store as string for database
      enrollment_date: '2023-02-01' // Store as string for database
    };

    const student2Result = await db.insert(studentsTable)
      .values(student2Data)
      .returning()
      .execute();

    const student2Id = student2Result[0].id;

    // Try to update student2's email to match student1's email
    const updateInput: UpdateStudentInput = {
      id: student2Id,
      email: 'john.doe@example.com' // This email already exists
    };

    await expect(updateStudent(updateInput)).rejects.toThrow();
  });

  it('should preserve enrollment_date and created_at fields', async () => {
    const studentId = await createTestStudent();
    
    // Get original student data
    const originalStudent = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, studentId))
      .execute();

    const updateInput: UpdateStudentInput = {
      id: studentId,
      first_name: 'Jane'
    };

    const result = await updateStudent(updateInput);

    expect(result.enrollment_date).toEqual(new Date(originalStudent[0].enrollment_date));
    expect(result.created_at).toEqual(new Date(originalStudent[0].created_at));
  });
});