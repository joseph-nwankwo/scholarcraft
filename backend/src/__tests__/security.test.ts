import { sanitizeInput, validateFileUpload } from '../middleware/security.middleware'
import type { Request, Response, NextFunction } from 'express'

function mockReq(body?: unknown, file?: Partial<Express.Multer.File>): Partial<Request> {
  return { body, file: file as Express.Multer.File | undefined, files: undefined }
}
const mockRes  = {} as Response
const mockNext = jest.fn() as NextFunction

beforeEach(() => jest.clearAllMocks())

describe('sanitizeInput', () => {
  it('strips <script> tags from string body fields', () => {
    const req = mockReq({ title: '<script>alert(1)</script>Hello' })
    sanitizeInput(req as Request, mockRes, mockNext)
    expect((req.body as { title: string }).title).toBe('Hello')
    expect(mockNext).toHaveBeenCalled()
  })

  it('strips javascript: URIs', () => {
    const req = mockReq({ url: 'javascript:alert(1)' })
    sanitizeInput(req as Request, mockRes, mockNext)
    expect((req.body as { url: string }).url).toBe('alert(1)')
  })

  it('recursively sanitizes nested objects', () => {
    const req = mockReq({ nested: { deep: '<script>x</script>safe' } })
    sanitizeInput(req as Request, mockRes, mockNext)
    expect((req.body as { nested: { deep: string } }).nested.deep).toBe('safe')
  })

  it('passes through non-string values unchanged', () => {
    const req = mockReq({ count: 42, active: true })
    sanitizeInput(req as Request, mockRes, mockNext)
    expect((req.body as { count: number }).count).toBe(42)
    expect((req.body as { active: boolean }).active).toBe(true)
  })
})

describe('validateFileUpload', () => {
  it('passes when no file is present', () => {
    const req = mockReq()
    validateFileUpload(req as Request, mockRes, mockNext)
    expect(mockNext).toHaveBeenCalled()
  })

  it('throws when file is too large', () => {
    const req = mockReq(undefined, {
      originalname: 'large.pdf',
      mimetype: 'application/pdf',
      size: 30 * 1024 * 1024,  // 30MB > 25MB limit
    })
    expect(() => validateFileUpload(req as Request, mockRes, mockNext))
      .toThrow('exceeds the 25MB size limit')
  })

  it('throws when mimetype is not allowed', () => {
    const req = mockReq(undefined, {
      originalname: 'script.exe',
      mimetype: 'application/x-executable',
      size: 100,
    })
    expect(() => validateFileUpload(req as Request, mockRes, mockNext))
      .toThrow('not allowed')
  })

  it('accepts valid PDF files', () => {
    const req = mockReq(undefined, {
      originalname: 'lecture.pdf',
      mimetype: 'application/pdf',
      size: 1024 * 1024,
      buffer: Buffer.from('%PDF-1.4 content'),
    })
    validateFileUpload(req as Request, mockRes, mockNext)
    expect(mockNext).toHaveBeenCalled()
  })
})
