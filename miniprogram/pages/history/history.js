const app = getApp()

Page({
  data: {
    records: [],
    loading: true,
    elderId: '' // 当前老人ID，用于筛选记录
  },

  onLoad() {
    // 从全局获取当前老人ID（老人端默认用 globalData.elderId）
    const elderId = app.globalData.elderId || ''
    this.setData({ elderId })
  },

  onShow() {
    // 设置自定义 tabBar 选中状态（老人端历史记录 = index 2）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }

    // 每次展示时刷新，确保能看到新增的就诊记录
    this.loadRecords()
  },

  /** 从 records 集合查询当前老人的就诊记录 */
  async loadRecords() {
    this.setData({ loading: true })
    const db = wx.cloud.database()
    const query = this.data.elderId
      ? db.collection('records').where({ userId: this.data.elderId })
      : db.collection('records')

    try {
      const res = await query.orderBy('date', 'desc').limit(50).get()
      const records = res.data.map(r => {
        // 格式化日期
        let dateStr = '未知时间'
        if (r.date) {
          const d = r.date instanceof Date ? r.date : new Date(r.date)
          if (!isNaN(d.getTime())) {
            dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          }
        }

        return {
          id: r._id,
          department: r.department || '未知科室',
          doctor: r.doctor || '未知医生',
          hospital: r.hospital || '未知医院',
          date: dateStr,
          status: r.isNew ? '待查看' : '已完成',
          diagnosis: r.diagnosis || '',
          source: r.source || 'elder'
        }
      })

      this.setData({ records, loading: false })
    } catch (err) {
      console.error('[history] 查询记录失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  /** 查看就诊摘要 — 跳转到详情页，传记录ID */
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  /** 跳转到录音页（录音已在 tabBar 中，用 switchTab） */
  goToRecord() {
    wx.switchTab({ url: '/pages/record/record' })
  }
})
