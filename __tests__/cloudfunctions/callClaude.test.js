/**
 * Unit tests for cloudfunctions/callClaude/index.js
 *
 * Tests the callClaude cloud function which simulates AI-powered
 * medical summary generation and updates the records collection.
 */

// ─── Mock setup ────────────────────────────────────────────────────────

const mockDocUpdate = jest.fn()
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
  sdk.database = mockDb.database
  return sdk
})

// ─── Require source ────────────────────────────────────────────────────

const callClaude = require('../../cloudfunctions/callClaude/index')

// ─── Test suite ────────────────────────────────────────────────────────

describe('cloudfunctions/callClaude', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default: no matching records
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
  })

  // ─── Parameter validation ──────────────────────────────────────────

  describe('parameter validation', () => {
    it('should fail when sourceText is missing', async () => {
      const result = await callClaude.main({ userId: 'user1' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：sourceText 或 userId')
    })

    it('should fail when userId is missing', async () => {
      const result = await callClaude.main({ sourceText: 'some text' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：sourceText 或 userId')
    })

    it('should fail when both parameters are missing', async () => {
      const result = await callClaude.main({})

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：sourceText 或 userId')
    })

    it('should fail when sourceText is empty string', async () => {
      const result = await callClaude.main({ sourceText: '', userId: 'user1' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：sourceText 或 userId')
    })

    it('should fail when userId is empty string', async () => {
      const result = await callClaude.main({ sourceText: 'text', userId: '' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：sourceText 或 userId')
    })

    it('should include fallback field with sourceText on validation failure', async () => {
      const result = await callClaude.main({ sourceText: 'patient text', userId: '' })

      expect(result.fallback).toBe('patient text')
    })

    it('should have empty fallback when sourceText is also missing', async () => {
      const result = await callClaude.main({ userId: 'user1' })

      expect(result.fallback).toBe('')
    })
  })

  // ─── Successful AI summary (mock) ─────────────────────────────────

  describe('successful mock AI summary', () => {
    it('should return code 0 on success', async () => {
      const result = await callClaude.main({
        sourceText: '医生：血压偏高。患者：好的。',
        userId: 'user1'
      })

      expect(result.code).toBe(0)
    })

    it('should return diagnosis in the response data', async () => {
      const result = await callClaude.main({
        sourceText: '对话内容',
        userId: 'user1'
      })

      expect(result.data.diagnosis).toBeDefined()
      expect(typeof result.data.diagnosis).toBe('string')
      expect(result.data.diagnosis.length).toBeGreaterThan(0)
    })

    it('should return all four summary fields', async () => {
      const result = await callClaude.main({
        sourceText: '对话内容',
        userId: 'user1'
      })

      expect(result.data).toHaveProperty('diagnosis')
      expect(result.data).toHaveProperty('medicine')
      expect(result.data).toHaveProperty('followUp')
      expect(result.data).toHaveProperty('advice')
    })

    it('should return mock diagnosis containing "高血压"', async () => {
      const result = await callClaude.main({
        sourceText: '对话内容',
        userId: 'user1'
      })

      expect(result.data.diagnosis).toContain('高血压')
    })

    it('should return mock medicine containing "硝苯地平"', async () => {
      const result = await callClaude.main({
        sourceText: '对话内容',
        userId: 'user1'
      })

      expect(result.data.medicine).toContain('硝苯地平')
    })

    it('should update the matching record when found', async () => {
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
          update: mockDocUpdate
        })
      })

      mockDocUpdate.mockResolvedValue({ stats: { updated: 1 } })

      const result = await callClaude.main({
        sourceText: '对话内容',
        userId: 'user1'
      })

      expect(result.code).toBe(0)
      expect(mockDocUpdate).toHaveBeenCalledWith({
        data: {
          diagnosis: expect.any(String),
          medicine: expect.any(String),
          followUp: expect.any(String),
          advice: expect.any(String)
        }
      })
    })

    it('should not fail when no matching record is found', async () => {
      mockWhereGet.mockResolvedValue({ data: [] })

      mockDb.collection.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: mockOrderBy.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              get: mockWhereGet
            })
          })
        })
      })

      const result = await callClaude.main({
        sourceText: '对话内容',
        userId: 'user1'
      })

      expect(result.code).toBe(0)
    })

    it('should query records by userId', async () => {
      mockDb.collection.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: mockOrderBy.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              get: mockWhereGet
            })
          })
        })
      })

      await callClaude.main({
        sourceText: '对话内容',
        userId: 'user_abc'
      })

      expect(mockWhere).toHaveBeenCalledWith({ userId: 'user_abc' })
    })

    it('should order by date descending and limit to 1', async () => {
      mockDb.collection.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: mockOrderBy.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              get: mockWhereGet
            })
          })
        })
      })

      await callClaude.main({
        sourceText: '对话内容',
        userId: 'user1'
      })

      expect(mockOrderBy).toHaveBeenCalledWith('date', 'desc')
      expect(mockLimit).toHaveBeenCalledWith(1)
    })
  })

  // ─── Error handling ────────────────────────────────────────────────

  describe('error handling', () => {
    it('should handle database query failure', async () => {
      mockDb.collection.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: mockOrderBy.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              get: jest.fn().mockRejectedValue(new Error('DB query failed'))
            })
          })
        })
      })

      const result = await callClaude.main({
        sourceText: '对话内容',
        userId: 'user1'
      })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('DB query failed')
    })

    it('should include fallback with sourceText on runtime error', async () => {
      mockDb.collection.mockReturnValue({
        where: mockWhere.mockReturnValue({
          orderBy: mockOrderBy.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              get: jest.fn().mockRejectedValue(new Error('crash'))
            })
          })
        })
      })

      const result = await callClaude.main({
        sourceText: 'patient conversation text',
        userId: 'user1'
      })

      expect(result.fallback).toBe('patient conversation text')
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

      const result = await callClaude.main({
        sourceText: 'text',
        userId: 'user1'
      })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('AI摘要生成失败')
    })

    it('should handle database update failure after finding record', async () => {
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
          update: jest.fn().mockRejectedValue(new Error('Update error'))
        })
      })

      const result = await callClaude.main({
        sourceText: '对话内容',
        userId: 'user1'
      })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('Update error')
    })
  })
})
