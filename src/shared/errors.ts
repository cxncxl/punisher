/**
 * Base application-specific error. All custom errors should extend this.
 */
export class AppError extends Error {
  /**
   * Creates an instance of AppError.
   */
  constructor(message: string) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when a requested record is not found in the database.
 */
export class RecordNotFoundError extends AppError {
  /**
   * Creates an instance of RecordNotFoundError.
   */
  constructor(message: string) {
    super(message);
    this.name = "RecordNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Unknown internal error
 */
export class InternalError extends AppError {
  /**
   * Creates an instance of InternalError.
   */
  constructor(message: string) {
    super(message);
    this.name = "InternalError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Any error related to AI invocations */
export class AIError extends AppError {
  /**
   * Creates an instance of AIError.
   */
  constructor(message: string) {
    super(message);
    this.name = "AIError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
