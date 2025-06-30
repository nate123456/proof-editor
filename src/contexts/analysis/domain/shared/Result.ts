export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export const success = <T>(data: T): Result<T, never> => ({ success: true, data });

export const failure = <E>(error: E): Result<never, E> => ({ success: false, error });

export const isSuccess = <T, E>(result: Result<T, E>): result is { success: true; data: T } => {
  return result.success;
};

export const isFailure = <T, E>(result: Result<T, E>): result is { success: false; error: E } => {
  return !result.success;
};