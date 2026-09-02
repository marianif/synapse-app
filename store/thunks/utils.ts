/**
 * Log a failed async store operation, then rethrow so the calling surface can
 * decide how to surface it — mirrors the old DatabaseContext contract where
 * mutations logged `[DatabaseContext] … failed:` and propagated the error.
 */
export async function run<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[store] ${label} failed:`, error);
    throw error;
  }
}