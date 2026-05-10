/**
 * Unit tests for cloudfunctions/callXunfei/index.js
 *
 * Tests the callXunfei cloud function which simulates speech-to-text
 * transcription and updates the records collection.
 */

// ─── Mock setup ────────────────────────────────────────────────────────

const mockDocUpdate = jest.fn()
const mockDocGet = jest.fn()
const mockWhereGet = jest.fn()
const mockOrderBy = jest.fn()
const mockLimit = jest.fn()
const mockWhere = jest.fn()

const mockDb = {
  collection: jest.fn()
}

const mockCloud = {
  init: jest.fn(),
  DYNAMIC_CURRENT_ENV: 'mock-env'
}

jest.mock('wx-server-sdk', () => {
  const sdk = {
    init: mockCloud.init,
    DYNAMIC_CURRENT_ENV: 'mock-env'
  }
  Object.defineProperty(sdk, 'database', {
    get: () => mockDb.database,
    writable: true
  })
  // Attach database as a function
  sdk.database = mockDb.database
  return sdk
})

// ─── Require source ────────────────────────────────────────────────────

const callXunfei = require('../../cloudfunctions/callXunfei/index')

// ─── Test suite ────────────────────────────────────────────────────────

describe('cloudfunctions/callXunfei', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default: no matching records found
    const emptyQueryChain = {
      orderBy: mockOrderBy,
      get: mockWhereGet
    }
    mockOrderBy.mockReturnValue({
      limit: mockLimit
    })
    mockLimit.mockReturnValue({
      get: mockWhereGet
    })
    mockWhereGet.mockResolvedValue({ data: [] })

    mockDb.collection.mockReturnValue({
      where: mockWhere
    })
    mockWhere.mockReturnValue(emptyQueryChain)

    // doc() for update
    mockDb.collection.mockReturnValue({
      where: mockWhere,
      doc: jest.fn().mockReturnValue({
        update: mockDocUpdate,
        get: mockDocGet
      })
    })
  })

  // ─── Parameter validation ──────────────────────────────────────────

  describe('parameter validation', () => {
    it('should fail when fileID is missing', async () => {
      const result = await callXunfei.main({})

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：fileID')
    })

    it('should fail when fileID is empty string', async () => {
      const result = await callXunfei.main({ fileID: '' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：fileID')
    })

    it('should use default language "auto" when not provided', async () => {
      // We can't directly check the language param, but we verify it doesn't fail
      const result = await callXunfei.main({ fileID: 'cloud://test.m4a' })

      expect(result.code).toBe(0)
    })
  })

  // ─── Successful transcription (mock) ──────────────────────────────

  describe('successful mock transcription', () => {
    it('should return code 0 on success', async () => {
      const result = await callXunfei.main({ fileID: 'cloud://test.m4a' })

      expect(result.code).toBe(0)
    })

    it('should return mock text in the response data', async () => {
      const result = await callXunfei.main({ fileID: 'cloud://test.m4a' })

      expect(result.data.text).toBeDefined()
      expect(typeof result.data.text).toBe('string')
      expect(result.data.text.length).toBeGreaterThan(0)
    })

    it('should return a mock duration number', async () => {
      const result = await callXunfei.main({ fileID: 'cloud://test.m4a' })

      expect(result.data.duration).toBeDefined()
      expect(typeof result.data.duration).toBe('number')
    })

    it('should contain typical doctor-patient dialogue in mock text', async () => {
      const result = await callXunfei.main({ fileID: 'cloud://test.m4a' })

      expect(result.data.text).toContain('医生')
      expect(result.data.text).toContain('患者')
    })

    it('should update the matching record in the database when found', async () => {
      // Simulate finding a matching record
      mockWhereGet.mockResolvedValue({
        data: [{ _id: 'rec_001' }]
      })
      mockDocUpdate.mockResolvedValue({ stats: { updated: 1 } })

      // Need to reconfigure mock to support both where() and doc() chains
      mockDb.collection.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: mockOrderBy.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              get: mockWhereGet
            })
          })
        }),
        doc: jest.fn().mockReturnValue({
          update: mockDocUpdate
        })
      })

      const result = await callXunfei.main({ fileID: 'cloud://test.m4a' })

      expect(result.code).toBe(0)
      expect(mockDocUpdate).toHaveBeenCalledWith({
        data: {
          transcript: expect.any(String)
        }
      })
    })

    it('should not fail when no matching record is found', async () => {
      mockWhereGet.mockResolvedValue({ data: [] })

      const result = await callXunfei.main({ fileID: 'cloud://test.m4a' })

      expect(result.code).toBe(0)
    })
  })

  // ─── Error handling ────────────────────────────────────────────────

  describe('error handling', () => {
    it('should handle database query failure', async () => {
      mockDb.collection.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: mockOrderBy.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              get: jest.fn().mockRejectedValue(new Error('DB connection failed'))
            })
          })
        })
      })

      const result = await callXunfei.main({ fileID: 'cloud://test.m4a' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('DB connection failed')
    })

    it('should handle database update failure', async () => {
      mockWhereGet.mockResolvedValue({
        data: [{ _id: 'rec_001' }]
      })

      mockDb.collection.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: mockOrderBy.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              get: mockWhereGet
            })
          })
        }),
        doc: jest.fn().mockReturnValue({
          update: jest.fn().mockRejectedValue(new Error('Update failed'))
        })
      })

      const result = await callXunfei.main({ fileID: 'cloud://test.m4a' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('Update failed')
    })

    it('should use default error message when err.message is empty', async () => {
      mockDb.collection.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: mockOrderBy.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              get: jest.fn().mockRejectedValue(new Error())
            })
          })
        })
      })

      const result = await callXunfei.main({ fileID: 'cloud://test.m4a' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('callXunfei 执行失败')
    })

    it('should handle non-Error exceptions', async () => {
      mockDb.collection.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: mockOrderBy.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              get: jest.fn().mockRejectedValue('string error')
            })
          })
        })
      })

      const result = await callXunfei.main({ fileID: 'cloud://test.m4a' })

      expect(result.code).toBe(-1)
    })
  })
})
