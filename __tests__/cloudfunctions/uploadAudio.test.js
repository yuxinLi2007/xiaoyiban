/**
 * Unit tests for cloudfunctions/uploadAudio/index.js
 *
 * Tests the uploadAudio cloud function which creates a new record
 * in the records collection when an audio file is uploaded.
 */

// ─── Mock setup ────────────────────────────────────────────────────────

const mockDocUpdate = jest.fn()
const mockCollectionAdd = jest.fn()
const mockCollection = jest.fn()
const mockServerDate = jest.fn(() => new Date())

const mockDb = {
  collection: mockCollection,
  serverDate: mockServerDate
}

const mockCloud = {
  init: jest.fn(),
  DYNAMIC_CURRENT_ENV: 'mock-env',
  database: jest.fn(() => mockDb)
}

jest.mock('wx-server-sdk', () => {
  const sdk = {
    init: mockCloud.init,
    DYNAMIC_CURRENT_ENV: 'mock-env'
  }
  Object.defineProperty(sdk, 'database', {
    value: mockCloud.database,
    writable: true
  })
  return sdk
})

// ─── Require source ────────────────────────────────────────────────────

const uploadAudio = require('../../cloudfunctions/uploadAudio/index')

// ─── Test suite ────────────────────────────────────────────────────────

describe('cloudfunctions/uploadAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock for db.collection().add()
    mockCollection.mockReturnValue({
      add: mockCollectionAdd
    })
    mockCollectionAdd.mockResolvedValue({ _id: 'rec_abc123' })
  })

  // ─── Parameter validation ──────────────────────────────────────────

  describe('parameter validation', () => {
    it('should fail when fileID is missing', async () => {
      const result = await uploadAudio.main({ userId: 'user1' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：fileID 或 userId')
    })

    it('should fail when userId is missing', async () => {
      const result = await uploadAudio.main({ fileID: 'cloud://test.m4a' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：fileID 或 userId')
    })

    it('should fail when both fileID and userId are missing', async () => {
      const result = await uploadAudio.main({})

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：fileID 或 userId')
    })

    it('should fail when fileID is empty string', async () => {
      const result = await uploadAudio.main({ fileID: '', userId: 'user1' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：fileID 或 userId')
    })

    it('should fail when userId is empty string', async () => {
      const result = await uploadAudio.main({ fileID: 'cloud://test.m4a', userId: '' })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('缺少必填参数：fileID 或 userId')
    })

    it('should reject unsupported audio format', async () => {
      const result = await uploadAudio.main({
        fileID: 'cloud://test.ogg',
        userId: 'user1',
        format: 'ogg'
      })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toContain('不支持的音频格式：ogg')
      expect(result.errMsg).toContain('mp3, m4a, wav, pcm')
    })

    it('should accept mp3 format', async () => {
      const result = await uploadAudio.main({
        fileID: 'cloud://test.mp3',
        userId: 'user1',
        format: 'mp3'
      })

      expect(result.code).toBe(0)
    })

    it('should accept wav format', async () => {
      const result = await uploadAudio.main({
        fileID: 'cloud://test.wav',
        userId: 'user1',
        format: 'wav'
      })

      expect(result.code).toBe(0)
    })

    it('should accept pcm format', async () => {
      const result = await uploadAudio.main({
        fileID: 'cloud://test.pcm',
        userId: 'user1',
        format: 'pcm'
      })

      expect(result.code).toBe(0)
    })

    it('should default format to m4a when not provided', async () => {
      const result = await uploadAudio.main({
        fileID: 'cloud://test.m4a',
        userId: 'user1'
      })

      expect(result.code).toBe(0)
    })
  })

  // ─── Successful record creation ────────────────────────────────────

  describe('successful record creation', () => {
    it('should return code 0 on success', async () => {
      const result = await uploadAudio.main({
        fileID: 'cloud://test.m4a',
        userId: 'user1'
      })

      expect(result.code).toBe(0)
    })

    it('should return the fileID and recordId on success', async () => {
      mockCollectionAdd.mockResolvedValue({ _id: 'rec_new_001' })

      const result = await uploadAudio.main({
        fileID: 'cloud://test.m4a',
        userId: 'user1'
      })

      expect(result.data.fileID).toBe('cloud://test.m4a')
      expect(result.data.recordId).toBe('rec_new_001')
    })

    it('should call db.collection("records").add() with correct data', async () => {
      await uploadAudio.main({
        fileID: 'cloud://test.m4a',
        userId: 'user1',
        format: 'm4a'
      })

      expect(mockCollection).toHaveBeenCalledWith('records')
      expect(mockCollectionAdd).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          audioFileID: 'cloud://test.m4a',
          format: 'm4a',
          date: expect.any(Date),
          isNew: true,
          transcript: '',
          diagnosis: '',
          medicine: '',
          followUp: '',
          advice: ''
        }
      })
    })

    it('should set isNew to true for new records', async () => {
      await uploadAudio.main({
        fileID: 'cloud://test.m4a',
        userId: 'user1'
      })

      const addCall = mockCollectionAdd.mock.calls[0][0]
      expect(addCall.data.isNew).toBe(true)
    })

    it('should set empty strings for AI fields (to be filled later)', async () => {
      await uploadAudio.main({
        fileID: 'cloud://test.m4a',
        userId: 'user1'
      })

      const addCall = mockCollectionAdd.mock.calls[0][0]
      expect(addCall.data.transcript).toBe('')
      expect(addCall.data.diagnosis).toBe('')
      expect(addCall.data.medicine).toBe('')
      expect(addCall.data.followUp).toBe('')
      expect(addCall.data.advice).toBe('')
    })
  })

  // ─── Error handling ────────────────────────────────────────────────

  describe('error handling', () => {
    it('should handle database add failure', async () => {
      mockCollectionAdd.mockRejectedValue(new Error('Database write failed'))

      const result = await uploadAudio.main({
        fileID: 'cloud://test.m4a',
        userId: 'user1'
      })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('Database write failed')
    })

    it('should handle database add failure without message', async () => {
      mockCollectionAdd.mockRejectedValue({})

      const result = await uploadAudio.main({
        fileID: 'cloud://test.m4a',
        userId: 'user1'
      })

      expect(result.code).toBe(-1)
      expect(result.errMsg).toBe('uploadAudio 执行失败')
    })
  })
})
