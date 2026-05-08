Page({
  data: {
    reports: [],
    unreadCount: 0,
    activeId: ''
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    const reports = this.data.reports
    const target = reports.find(r => r._id === id)

    // 未读卡片：先本地标记已读 + 播放动画，延迟后跳转
    if (target && target.isNew) {
      this.setData({ activeId: id })

      const updated = reports.map(item =>
        item._id === id ? { ...item, isNew: false } : item
      )
      const unreadCount = updated.filter(r => r.isNew).length
      this.setData({ reports: updated, unreadCount })

      setTimeout(() => {
        this.setData({ activeId: '' })
        wx.navigateTo({
          url: `/pages/child/detail/index?id=${id}`
        })
      }, 300)
    } else {
      // 已读卡片：直接跳转
      wx.navigateTo({
        url: `/pages/child/detail/index?id=${id}`
      })
    }
  },

  goAdd() {
    wx.navigateTo({
      url: '/pages/child/add/index'
    })
  },

  onShow() {
    this.getData()
  },

  getData() {
    const db = wx.cloud.database()
    db.collection('records').where({}).get().then(res => {
      const reports = res.data
      const unreadCount = reports.filter(r => r.isNew).length
      this.setData({ reports, unreadCount, activeId: '' })
    }).catch(err => {
      console.error('查询失败', err)
    })
  }
})
