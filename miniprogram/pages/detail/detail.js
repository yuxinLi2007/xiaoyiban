const app = getApp()

Page({
  data: {
    recordId: '',
    loading: true,
    // 基础信息
    department: '',
    doctor: '',
    hospital: '',
    date: '',
    statusText: '已完成',
    // AI 生成字段
    diagnosis: '',
    medicine: '',
    advice: '',
    followUp: '',
    // 语音转写
    transcript: '',
    // 老人名称
    elderName: '',
    // 语音播报状态: idle / loading / playing
    voiceState: 'idle',
    voiceBtnText: '📢 家人语音播报'
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '缺少记录ID', icon: 'none' })
      return
    }
    this.setData({ recordId: id })
    this.loadRecord(id)
  },

  /** 从 records 集合按 id 查询真实数据 */
  async loadRecord(recordId) {
    try {
      const res = await wx.cloud.database().collection('records').doc(recordId).get()
      const record = res.data

      // 格式化日期
      let dateStr = '未知时间'
      if (record.date) {
        const d = record.date instanceof Date ? record.date : new Date(record.date)
        if (!isNaN(d.getTime())) {
          dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        }
      }

      this.setData({
        loading: false,
        department: record.department || '未知科室',
        doctor: record.doctor || '未知医生',
        hospital: record.hospital || '未知医院',
        date: dateStr,
        diagnosis: record.diagnosis || '',
        medicine: record.medicine || '',
        advice: record.advice || '',
        followUp: record.followUp || '',
        transcript: record.transcript || '',
        statusText: record.isNew ? '待查看' : '已完成'
      })

      // 异步补全老人名称
      if (record.userId) {
        this.loadElderName(record.userId)
      }
    } catch (err) {
      console.error('[detail] 查询记录失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
    }
  },

  /** 根据 userId 查询老人名称 */
  async loadElderName(userId) {
    try {
      const res = await wx.cloud.database().collection('elders').doc(userId).get()
      if (res.data && res.data.name) {
        this.setData({ elderName: res.data.name })
      }
    } catch (e) {
      // 查询失败不影响页面展示
      console.warn('[detail] 查询老人名称失败:', e)
    }
  },

  /**
   * 家人语音播报 — 模拟 TTS 生成 + 播放流程
   * 后续接入真实 TTS/音频播放时只需替换本方法内部逻辑
   */
  playVoiceBroadcast() {
    const { advice, diagnosis, medicine, followUp } = this.data
    // 拼接待播报的文本
    const broadcastText = [diagnosis, medicine, advice, followUp].filter(Boolean).join('。')
    if (!broadcastText) {
      wx.showToast({ title: '暂无可播报内容', icon: 'none' })
      return
    }

    // 第 1 阶段：显示"正在生成家人叮嘱..."
    this.setData({
      voiceState: 'loading',
      voiceBtnText: '正在生成家人叮嘱...'
    })

    // 第 2 阶段：1.5 秒后切换为"播放中..."
    setTimeout(() => {
      this.setData({
        voiceState: 'playing',
        voiceBtnText: '▶ 播放中...'
      })
    }, 1500)

    // 第 3 阶段：再 2 秒后播报完成
    setTimeout(() => {
      this.setData({
        voiceState: 'idle',
        voiceBtnText: '📢 家人语音播报'
      })
      wx.showToast({ title: '播报完成', icon: 'none', duration: 1500 })
    }, 3500)
  }
})
