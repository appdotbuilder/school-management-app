import { db } from '../db';
import { subjectsTable } from '../db/schema';
import { type CreateSubjectInput, type Subject } from '../schema';
import { eq } from 'drizzle-orm';

export const createSubject = async (input: CreateSubjectInput): Promise<Subject> => {
  try {
    // Check if a subject with the same code already exists
    const existingSubject = await db.select()
      .from(subjectsTable)
      .where(eq(subjectsTable.code, input.code))
      .limit(1)
      .execute();

    if (existingSubject.length > 0) {
      throw new Error(`Subject with code '${input.code}' already exists`);
    }

    // Insert the new subject
    const result = await db.insert(subjectsTable)
      .values({
        name: input.name,
        code: input.code,
        description: input.description,
        credits: input.credits
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Subject creation failed:', error);
    throw error;
  }
};