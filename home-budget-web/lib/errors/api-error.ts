function isFieldErrorRecord(v: unknown): v is Record<string, string[]> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  return Object.values(v).every(
    (x) => Array.isArray(x) && x.every((i) => typeof i === "string")
  );
}

export class ApiError extends Error {
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }

  static fromResponse(error: unknown): ApiError {
    if (typeof error === "string") {
      return new ApiError(error);
    }

    if (isFieldErrorRecord(error)) {
      return new ApiError("Validation failed", error);
    }

    return new ApiError("An unexpected error occurred");
  }

  get isFieldLevel(): boolean {
    return this.fieldErrors !== undefined && Object.keys(this.fieldErrors).length > 0;
  }
}
