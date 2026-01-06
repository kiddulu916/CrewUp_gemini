import * as Sentry from '@sentry/nextjs';
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Standard response shape for all server actions
 */
export type ActionResponse<T = void> = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};

/**
 * Create a success response
 *
 * @example
 * ```ts
 * return success({ user });
 * return success(); // No data
 * ```
 */
export function success<T = void>(data?: T): ActionResponse<T> {
  if (data === undefined) {
    return { success: true };
  }
  return { success: true, data };
}

/**
 * Create an error response
 *
 * @example
 * ```ts
 * return error('Not authenticated');
 * return error('Validation failed', { email: ['Invalid email format'] });
 * ```
 */
export function error(
  message: string,
  fieldErrors?: Record<string, string[]>
): ActionResponse<never> {
  if (fieldErrors) {
    return { success: false, error: message, fieldErrors };
  }
  return { success: false, error: message };
}

/**
 * Validate input data against a Zod schema
 * Returns validated data or an error response with field-level errors
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   email: z.string().email(),
 *   name: z.string().min(2),
 * });
 *
 * const validation = validateInput(schema, { email: 'invalid', name: 'A' });
 * if (!validation.success) return validation.error;
 * const { email, name } = validation.data;
 * ```
 */
export function validateInput<T extends ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: ActionResponse<never> } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      
      for (const issue of err.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }

      return {
        success: false,
        error: error('Validation failed', fieldErrors),
      };
    }
    
    // Re-throw non-Zod errors
    throw err;
  }
}

/**
 * User-friendly error messages for common database errors
 */
const userFriendlyMessages: Record<string, string> = {
  // Supabase/PostgreSQL errors
  '23505': 'This record already exists',
  '23503': 'Referenced record not found',
  '23502': 'Required field is missing',
  '22P02': 'Invalid data format',
  '42501': 'You do not have permission to perform this action',
  PGRST116: 'Record not found',
  // Auth errors
  'invalid_credentials': 'Invalid email or password',
  'email_taken': 'This email is already registered',
  'weak_password': 'Password must be at least 6 characters',
  'user_not_found': 'User not found',
};

/**
 * Get a user-friendly error message from a database error
 * Logs the original error to Sentry for debugging
 */
export function getUserFriendlyError(
  err: unknown,
  defaultMessage = 'An unexpected error occurred'
): string {
  // * Log the full error to Sentry for debugging
  if (err instanceof Error || (typeof err === 'object' && err !== null)) {
    Sentry.captureException(err);
  }

  // * Handle Supabase/PostgreSQL errors
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>;

    // Check for PostgreSQL error codes
    if (typeof errorObj.code === 'string') {
      const friendlyMessage = userFriendlyMessages[errorObj.code];
      if (friendlyMessage) {
        return friendlyMessage;
      }
    }

    // Check for Supabase REST API errors
    if (typeof errorObj.message === 'string') {
      // Don't expose internal error messages
      if (errorObj.message.includes('duplicate key')) {
        return 'This record already exists';
      }
      if (errorObj.message.includes('violates foreign key')) {
        return 'Referenced record not found';
      }
      if (errorObj.message.includes('violates not-null')) {
        return 'Required field is missing';
      }
    }
  }

  // * Handle standard Error objects
  if (err instanceof Error) {
    // Check if it's a known error type
    const friendlyMessage = userFriendlyMessages[err.message];
    if (friendlyMessage) {
      return friendlyMessage;
    }
  }

  return defaultMessage;
}

/**
 * Wrapper for server action error handling
 * Catches errors, logs to Sentry, and returns a user-friendly response
 *
 * @example
 * ```ts
 * export async function createUser(data: FormData) {
 *   return handleActionError(async () => {
 *     const supabase = await createClient(await cookies());
 *     // ... action logic
 *     return success({ userId: user.id });
 *   }, 'Failed to create user');
 * }
 * ```
 */
export async function handleActionError<T>(
  action: () => Promise<ActionResponse<T>>,
  defaultErrorMessage = 'An unexpected error occurred'
): Promise<ActionResponse<T>> {
  try {
    return await action();
  } catch (err) {
    console.error('[Action Error]:', err);
    return error(getUserFriendlyError(err, defaultErrorMessage));
  }
}

/**
 * Authentication guard for server actions
 * Returns an error response if user is not authenticated
 *
 * @example
 * ```ts
 * const authResult = await requireAuth(supabase);
 * if (!authResult.success) return authResult;
 * const user = authResult.data;
 * ```
 */
export async function requireAuth(
  supabase: { auth: { getUser: () => Promise<{ data: { user: any }; error: any }> } }
): Promise<ActionResponse<{ id: string; email?: string }>> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return error('Not authenticated');
  }

  return success({ id: user.id, email: user.email });
}

/**
 * Admin authorization guard for server actions
 * Returns an error response if user is not an admin
 *
 * @example
 * ```ts
 * const adminResult = await requireAdmin(supabase, user.id);
 * if (!adminResult.success) return adminResult;
 * ```
 */
export async function requireAdmin(
  supabase: { from: (table: string) => any },
  userId: string
): Promise<ActionResponse<void>> {
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (!profile?.is_admin) {
    return error('Not authorized');
  }

  return success();
}

/**
 * Pro subscription guard for server actions
 * Returns an error response if user doesn't have Pro subscription
 *
 * @example
 * ```ts
 * const proResult = await requirePro(supabase, user.id);
 * if (!proResult.success) return proResult;
 * ```
 */
export async function requirePro(
  supabase: { from: (table: string) => any },
  userId: string
): Promise<ActionResponse<void>> {
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', userId)
    .single();

  if (profile?.subscription_status !== 'pro') {
    return error('This feature requires a Pro subscription');
  }

  return success();
}

