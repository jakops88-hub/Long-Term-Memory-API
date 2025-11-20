export interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status?: number;
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: Record<string, unknown>;

  constructor({ code, message, status = 400, details }: ErrorPayload) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
