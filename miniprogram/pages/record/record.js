const app = getApp()
const db = wx.cloud.database()
const recorderManager = wx.getRecorderManager()
const innerAudioContext = wx.createInnerAudioContext()

Page({
  data: {
    isRecording: false,
    buttonText: '按住开始录音',
    audioPath: '',
    debugMode: true,
    demoFileID: 'cloud://cloudbase-d7gtr74bw289f62e6.636c-cloudbase-d7gtr74bw289f62e6-1427538276/20260510_104718.m4a'
  },

  onLoad() {
    // 设置自定义 tabBar 选中状态（老人端录音 = index 1）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }

    // 监听录音结束
    recorderManager.onStop((res) => {
      this.setData({
        isRecording: false,
        buttonText: '录音完成',
        audioPath: res.tempFilePath
      })
    })

    // 录音错误处理
    recorderManager.onError((err) => {
      console.error('录音错误', err)
      this.setData({ isRecording: false, buttonText: '点击开始录音' })
      wx.showToast({ title: '录音失败，请重试', icon: 'none' })
    })

    // 音频播放错误处理
    innerAudioContext.onError((err) => {
      console.error('播放失败', err)
      wx.showToast({ title: '播放失败，请使用真机测试', icon: 'none', duration: 3000 })
    })
  },

  // 真实录音：开始/停止
  toggleRecord() {
    if (this.data.isRecording) {
      recorderManager.stop()
    } else {
      wx.authorize({ scope: 'scope.record' }).then(() => {
        recorderManager.start({
          duration: 600000,
          sampleRate: 16000,
          format: 'mp3'
        })
        this.setData({ isRecording: true, buttonText: '录音中... 点击结束' })
      }).catch(() => {
        wx.showToast({ title: '请授权录音权限', icon: 'none' })
      })
    }
  },

  // 播放录音
  playAudio() {
    if (!this.data.audioPath) {
      wx.showToast({ title: '暂无录音可播放', icon: 'none' })
      return
    }
    innerAudioContext.src = this.data.audioPath
    innerAudioContext.play()
  },

  // 完成录音：上传云存储 → 调用全链路云函数
  async finishRecord() {
    if (!this.data.audioPath) {
      wx.showToast({ title: '请先完成录音', icon: 'none' })
      return
    }

    wx.showLoading({ title: '上传录音中...' })

    try {
      // 1. 上传音频文件到云存储（修复问题6）
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: 'audio/' + Date.now() + '.mp3',
        filePath: this.data.audioPath
      })
      const fileID = uploadRes.fileID
      console.log('[真实录音] 上传成功, fileID:', fileID)

      // 2. 获取当前老人ID（从全局登录态获取，兜底用缓存）
      const elderId = app.globalData.elderId || wx.getStorageSync('elderId') || ''
      if (!elderId) {
        wx.hideLoading()
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      // 3. 调用 uploadAudio 云函数
      const audioRes = await wx.cloud.callFunction({
        name: 'uploadAudio',
        data: { fileID, format: 'mp3', userId: elderId }
      })
      if (audioRes.result.code !== 0) throw new Error(audioRes.result.errMsg)
      const recordId = audioRes.result.data.recordId

      // 4. 调用 callXunfei（传入 recordId，修复问题4）
      const xunfeiRes = await wx.cloud.callFunction({
        name: 'callXunfei',
        data: { fileID, recordId, language: 'auto' }
      })
      if (xunfeiRes.result.code !== 0) throw new Error(xunfeiRes.result.errMsg)

      // 5. 调用 callClaude（传入 recordId 和 userId，修复问题5）
      const claudeRes = await wx.cloud.callFunction({
        name: 'callClaude',
        data: {
          sourceText: xunfeiRes.result.data.text,
          recordId,
          userId: elderId
        }
      })
      if (claudeRes.result.code !== 0) throw new Error(claudeRes.result.errMsg)

      wx.hideLoading()
      wx.showToast({ title: '就诊记录已生成', icon: 'success' })

      // 6. 跳转逻辑：老人端优先跳转到老人端详情页（修复问题7）
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/detail/detail?id=' + recordId })
      }, 1000)

    } catch (err) {
      wx.hideLoading()
      console.error('[真实录音] 流程失败:', err)
      wx.showToast({ title: '操作失败：' + err.message, icon: 'none' })
    }
  },

  // 模拟就诊：路演演示使用
  async simulateVisit() {
    wx.showLoading({ title: '就诊记录生成中...' })
    const elderId = app.globalData.elderId || wx.getStorageSync('elderId') || ''
    if (!elderId) {
      wx.hideLoading()
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const fileID = this.data.demoFileID

    try {
      const audioRes = await wx.cloud.callFunction({
        name: 'uploadAudio',
        data: { fileID, format: 'm4a', userId: elderId }
      })
      if (audioRes.result.code !== 0) throw new Error(audioRes.result.errMsg)
      const recordId = audioRes.result.data.recordId
      console.log('[模拟] uploadAudio 成功, recordId:', recordId)

      const xunfeiRes = await wx.cloud.callFunction({
        name: 'callXunfei',
        data: { fileID, recordId, language: 'auto' }
      })
      if (xunfeiRes.result.code !== 0) throw new Error(xunfeiRes.result.errMsg)
      console.log('[模拟] callXunfei 成功')

      const claudeRes = await wx.cloud.callFunction({
        name: 'callClaude',
        data: { sourceText: xunfeiRes.result.data.text, recordId, userId: elderId }
      })
      if (claudeRes.result.code !== 0) throw new Error(claudeRes.result.errMsg)
      console.log('[模拟] callClaude 成功')

      wx.hideLoading()
      wx.showToast({ title: '就诊记录已生成', icon: 'success' })
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/child/detail/index?id=' + recordId })
      }, 1000)
    } catch (err) {
      wx.hideLoading()
      console.error('[模拟] 流程失败:', err)
      wx.showToast({ title: '生成失败：' + err.message, icon: 'none' })
    }
  }
})