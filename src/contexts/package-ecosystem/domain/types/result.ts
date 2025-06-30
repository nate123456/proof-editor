export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export namespace Result {
  export function success<T>(data: T): Result<T, never> {
    return { success: true, data };
  }

  export function failure<E>(error: E): Result<never, E> {
    return { success: false, error };
  }

  export function map<T, U, E>(
    result: Result<T, E>,
    mapper: (data: T) => U
  ): Result<U, E> {
    if (result.success) {
      return success(mapper(result.data));
    }
    return result;
  }

  export function flatMap<T, U, E>(
    result: Result<T, E>,
    mapper: (data: T) => Result<U, E>
  ): Result<U, E> {
    if (result.success) {
      return mapper(result.data);
    }
    return result;
  }

  export function match<T, E, U>(
    result: Result<T, E>,
    handlers: {
      success: (data: T) => U;
      failure: (error: E) => U;
    }
  ): U {
    if (result.success) {
      return handlers.success(result.data);
    }
    return handlers.failure(result.error);
  }

  export function combine<T extends readonly unknown[], E>(
    results: { [K in keyof T]: Result<T[K], E> }
  ): Result<T, E> {
    const values = [] as unknown as T;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result.success) {
        return result;
      }
      (values as unknown[])[i] = result.data;
    }
    return success(values);
  }
}