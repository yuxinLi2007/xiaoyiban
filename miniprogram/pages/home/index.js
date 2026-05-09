// pages/home/index.js - 首页（三层状态防白屏 + 未读红点联动）

const db = wx.cloud.database()

Page({
  data: {
    loading: true,
    isLoggedIn: false,
    familyInfo: {},
    elders: [],
    totalUnread: 0,
    debugInfo: ''
  },

  /* ========== 每次显示都重新拉取（确保未读数最新）========== */
  onShow() {
    console.log('[home] ===== onShow 触发 =====')

    const app = getApp()
    let familyId = ''

    try {
      familyId = app.globalData.familyId || wx.getStorageSync('familyId') || ''
    } catch (e) {}

    if (!familyId) {
      this.setData({ isLoggedIn: false, loading: false, elders: [], debugInfo: 'no_familyid' })
      return
    }

    this.setData({
      isLoggedIn: true,
      loading: false,
      'familyInfo._id': familyId,
      debugInfo: 'logged_in_' + familyId
    })

    this.getData(familyId)
  },

  getData(familyId) {
    console.log('[home] getData() 开始拉取数据, familyId:', familyId)

    db.collection('elders').where({}).get().then(elderRes => {
      const elders = elderRes.data || []

      db.collection('records').where({})
        .orderBy('date', 'desc')
        .get().then(recordRes => {
          const records = recordRes.data || []
          let totalUnread = 0

          const eldersWithStats = elders.map(elder => {
            const elderRecords = records.filter(r => r.elderId === elder._id)
            let unreadCount = 0
            elderRecords.forEach(r => { if (r.isNew === true) unreadCount++ })
            const latestRecord = elderRecords.length > 0 ? elderRecords[0] : null
            totalUnread += unreadCount

            // 状态标签
            let statusTag = 'normal'
            let statusText = '正常'
            if (latestRecord && latestRecord.status === 'need_review') {
              statusTag = 'warning'
              statusText = '需复诊'
            } else if (latestRecord && latestRecord.status === 'done') {
              statusTag = 'done'
              statusText = '已完成'
            }

            return {
              _id: elder._id,
              name: elder.name || '未命名',
              age: elder.age || '',
              gender: elder.gender || '',
              unreadCount: unreadCount,
              recordCount: elderRecords.length,
              latestRecord: latestRecord,
              statusTag: statusTag,
              statusText: statusText
            }
          })

          console.log(`[home] 家人数: ${eldersWithStats.length}, 总未读: ${totalUnread}`)

          this.setData({ elders: eldersWithStats, totalUnread: totalUnread })

        }).catch(err => {
          console.error('[home] records查询失败', err)
        })

    }).catch(err => {
      console.error('[home] elders查询失败', err)
      this.setData({ elders: [], totalUnread: 0 })
    })
  },

  goLogin() {
    wx.redirectTo({ url: '/pages/login/index' })
  },

  goElderDetail(e) {
    getApp().globalData.preSelectElderId = e.currentTarget.dataset.id
    wx.switchTab({ url: '/pages/list/index' })
  },

  goList() {
    getApp().globalData.preSelectElderId = ''
    wx.switchTab({ url: '/pages/list/index' })
  }
})
