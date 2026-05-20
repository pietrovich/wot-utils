export class WGApiError extends Error {
  constructor(
    public readonly field: string,
    public readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'WGApiError';
  }
}
