export class ApiError extends Error {
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }

  // String(err) returns just the message — keeps toast descriptions clean
  override toString() {
    return this.message
  }
}
