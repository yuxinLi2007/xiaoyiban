const db = wx.cloud.database()

Page({
  data: {
    elders: [],
    records: [],
    filteredRecords: [],
    unreadCount: 0,
    activeTab: 'all',
    tabs: [{ key: 'all', label: '全部' }]
  },

  /* ========== 每次显示都重新拉取最新数据（关键！）========== */
  onShow() {
    console.log('[list] ===== onShow 触发，开始重新拉取数据 =====')
    this.getData()
  },

  getData() {
    console.log('[list] getData() 开始执行')

    // 1. 查询老人列表
    db.collection('elders').where({}).get().then(elderRes => {
      const elders = elderRes.data || []
      const tabs = [{ key: 'all', label: '全部' }]
      for (let i = 0; i < elders.length; i++) {
        tabs.push({ key: elders[i]._id, label: elders[i].name })
      }

      // 2. 查询记录列表（每次从数据库拿最新）
      db.collection('records').where({})
        .orderBy('date', 'desc')
        .get().then(recordRes => {
          const records = recordRes.data || []
          let unreadCount = 0

          for (let j = 0; j < records.length; j++) {
            if (records[j].isNew === true) unreadCount++
          }

          console.log(`[list] 记录总数: ${records.length}, 未读数: ${unreadCount}`)

          // 构建 elderName 映射
          const elderMap = {}
          for (let k = 0; k < elders.length; k++) {
            elderMap[elders[k]._id] = elders[k].name
          }

          // 补全每条记录的显示信息（携带 _id 和 isNew 最新值）
          const enrichedRecords = records.map(r => {
            let statusText = '待确认'
            let statusClass = 'tag-pending'
            if (r.status === 'done') { statusText = '已完成'; statusClass = 'tag-done' }
            else if (r.status === 'need_review') { statusText = '需复诊'; statusClass = 'tag-review' }

            return {
              _id: r._id,
              elderId: r.elderId || '',
              elderName: r.elderId ? (elderMap[r.elderId] || '') : (r.name || ''),
              diagnosis: r.diagnosis || '',
              date: r.date || '',
              doctor: r.doctor || '',
              hospital: r.hospital || '',
              department: r.department || '',
              source: r.source || '',
              isNew: r.isNew === true,   // 确保是布尔值
              statusText: statusText,
              statusClass: statusClass
            }
          })

          this.setData({
            elders: elders,
            records: enrichedRecords,
            unreadCount: unreadCount,
            tabs: tabs
          })

          this.filterRecords()
          console.log(`[list] ✅ 数据加载完成, 显示 ${this.data.filteredRecords.length} 条`)
        })

    }).catch(err => {
      console.error('[list] 查询失败', err)
    })
  },

  onTabTap(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ activeTab: key })
    this.filterRecords()
  },

  filterRecords() {
    const records = this.data.records
    const activeTab = this.data.activeTab
    let filtered = []
    if (activeTab === 'all') {
      filtered = records
    } else {
      for (let i = 0; i < records.length; i++) {
        if (records[i].elderId === activeTab) {
          filtered.push(records[i])
        }
      }
    }
    this.setData({ filteredRecords: filtered })
  },

  /* ========== 点击进入详情，使用 _id ========== */
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    console.log('[list] 点击查看详情, _id:', id)
    wx.navigateTo({ url: '/pages/child/detail/index?id=' + id })
  }
})
