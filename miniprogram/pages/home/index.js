// pages/home/index.js - 首页（微信风格未读红点联动）

const db = wx.cloud.database()

Page({
  data: {
    loading: true,
    isLoggedIn: false,
    familyInfo: {},
    elders: [],
    totalUnread: 0
  },

  /* ========== 每次显示都重新拉取（确保未读数同步）========== */
  onShow() {
    console.log('[home] ===== onShow 触发 =====')

    var app = getApp()
    var familyId = ''

    try {
      familyId = app.globalData.familyId || wx.getStorageSync('familyId') || ''
    } catch (e) {}

    if (!familyId) {
      this.setData({ isLoggedIn: false, loading: false, elders: [], totalUnread: 0 })
      return
    }

    this.setData({
      isLoggedIn: true,
      loading: false,
      'familyInfo._id': familyId
    })

    this.getData(familyId)
  },

  /**
   * 从数据库拉取 elders + records
   * 为每个家人计算 unreadCount（仅基于 isNew 字段）
   * 删除所有 status/statusText/statusTag 相关逻辑
   */
  getData(familyId) {
    console.log('[home] getData(), familyId:', familyId)

    db.collection('elders').where({}).get().then(function(elderRes) {
      var elders = elderRes.data || []

      db.collection('records').where({})
        .orderBy('date', 'desc')
        .get().then(function(recordRes) {
          var records = recordRes.data || []
          var totalUnread = 0

          var eldersWithStats = elders.map(function(elder) {
            var elderRecords = records.filter(function(r) { return r.elderId === elder._id })
            var unreadCount = 0
            elderRecords.forEach(function(r) {
              if (r.isNew === true) unreadCount++
            })
            var latestRecord = elderRecords.length > 0 ? elderRecords[0] : null
            totalUnread += unreadCount

            // 显示名称：优先用 displayName，否则从 name+relation 拼接
            var rawName = elder.name || '未命名'
            var rawRelation = elder.relation || ''
            // 数据库中 name 为"父亲/母亲"时，自动补全为"姓名 · 关系"
            // 对接真实数据后，数据库直接存入真实姓名 + relation 即可
            var displayName, displayRelation
            if (rawName === '父亲') {
              displayName = '张建国'
              displayRelation = '父亲'
            } else if (rawName === '母亲') {
              displayName = '李秀英'
              displayRelation = '母亲'
            } else if (rawRelation) {
              displayName = rawName
              displayRelation = rawRelation
            } else {
              displayName = rawName
              displayRelation = '家人'
            }

            return {
              _id: elder._id,
              name: displayName,
              relation: displayRelation,
              age: elder.age || '',
              gender: elder.gender || '',
              unreadCount: unreadCount,
              recordCount: elderRecords.length,
              latestRecord: latestRecord
            }
          })

          console.log('[home] 家人数:', eldersWithStats.length, ', 总未读:', totalUnread)

          this.setData({ elders: eldersWithStats, totalUnread: totalUnread })

        }.bind(this))

    }.bind(this)).catch(function(err) {
      console.error('[home] 数据查询失败', err)
      this.setData({ elders: [], totalUnread: 0 })
    }.bind(this))
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
