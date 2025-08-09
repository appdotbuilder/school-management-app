import { db } from '../db';
import { subjectsTable } from '../db/schema';
import { type Subject } from '../schema';

export const getSubjects = async (): Promise<Subject[]> => {
  try {
    // Fetch all subjects from database
    const results = await db.select()
      .from(subjectsTable)
      .execute();

    // Return subjects (no numeric conversions needed - credits is integer)
    return results;
  } catch (error) {
    console.error('Failed to fetch subjects:', error);
    throw error;
  }
};