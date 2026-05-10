/**
 * 就诊记录列表页
 *
 * 核心逻辑：
 *   1. 只以 isNew 字段判断未读（微信红点风格）
 *   2. 每次返回页面 onShow 都从数据库重新拉取最新数据
 *   3. 不缓存、不使用旧数据
 *   4. 删除所有 status / statusText / pending 相关代码
 */

const db = wx.cloud.database()

Page({
  data: {
    elders: [],
    records: [],
    filteredRecords: [],
    unreadCount: 0,
    activeTab: 'all',
    tabs: [{ key: 'all', label: '全部' }],
    loading: false
  },

  /* ============================================================
   *  每次显示都重新拉取数据库最新数据
   *  这是红点消失的关键：返回列表 → onShow → 重新查库 → isNew 已是 false
   * ============================================================ */
  onShow() {
    console.log('[list] ===== onShow 触发 =====')
    this.getRecords()
  },

  /* ============================================================
   *  从数据库拉取 elders + records
   *  每次都是全新查询，不用缓存
   * ============================================================ */
  getRecords() {
    console.log('[list] getRecords() 开始查询数据库')

    this.setData({ loading: true })

    Promise.all([
      db.collection('elders').where({}).get(),
      db.collection('records').where({}).orderBy('date', 'desc').get()
    ]).then(([elderRes, recordRes]) => {

      var elders = elderRes.data || []
      var records = recordRes.data || []
      var unreadCount = 0

      console.log('[list] 原始记录数:', records.length)

      // 构建 tabs
      var tabs = [{ key: 'all', label: '全部' }]
      for (var i = 0; i < elders.length; i++) {
        tabs.push({ key: elders[i]._id, label: elders[i].name })
      }

      // 构建 elderName 映射
      var elderMap = {}
      for (var k = 0; k < elders.length; k++) {
        elderMap[elders[k]._id] = elders[k].name
      }

      // 组装显示数据（只保留必要字段，isNew 是唯一的未读标识）
      var enrichedRecords = records.map(function(r) {
        var isNewVal = r.isNew === true
        if (isNewVal) unreadCount++

        // --- 修复：日期格式化处理 ---
        // serverDate 对象在云函数写入后，前端读到的是对象，需要转为字符串
        // 已有的字符串日期（如 "2026-05-01"）直接保留
        var displayDate = ''
        var rawDate = r.date
        if (rawDate) {
          if (typeof rawDate === 'string') {
            // 已经是字符串格式，直接使用
            displayDate = rawDate
          } else {
            // serverDate 对象需要转换
            try {
              var d = new Date(rawDate)
              if (!isNaN(d.getTime())) {
                var year = d.getFullYear()
                var month = String(d.getMonth() + 1).padStart(2, '0')
                var day = String(d.getDate()).padStart(2, '0')
                displayDate = year + '-' + month + '-' + day
              }
            } catch (e) {
              displayDate = ''
            }
          }
        }

        return {
          _id: r._id,
          elderId: r.elderId || '',
          elderName: r.elderId ? (elderMap[r.elderId] || '') : (r.name || ''),
          diagnosis: r.diagnosis || '',
          date: displayDate,
          doctor: r.doctor || '',
          hospital: r.hospital || '',
          department: r.department || '',
          source: r.source || '',
          isNew: isNewVal
        }
      })

      console.log('[list] 记录总数:', enrichedRecords.length, ', 未读数:', unreadCount)
      console.log('[list] 各条记录isNew状态:', enrichedRecords.map(function(r) {
        return r._id.slice(-6) + ':' + r.isNew
      }).join(' | '))

      this.setData({
        elders: elders,
        records: enrichedRecords,
        unreadCount: unreadCount,
        tabs: tabs,
        loading: false
      })

      this.filterRecords()

    }).catch(function(err) {
      console.error('[list] 数据库查询失败')
      console.error('[list] errCode:', err.errCode)
      console.error('[list] errMsg:', err.errMsg)
      this.setData({ loading: false, records: [], filteredRecords: [], unreadCount: 0 })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }.bind(this))
  },

  /* ========== Tab 筛选切换 ========== */
  onTabTap(e) {
    var key = e.currentTarget.dataset.key
    this.setData({ activeTab: key })
    this.filterRecords()
  },

  filterRecords() {
    var records = this.data.records
    var activeTab = this.data.activeTab
    var filtered = []

    if (activeTab === 'all') {
      filtered = records
    } else {
      for (var i = 0; i < records.length; i++) {
        if (records[i].elderId === activeTab) {
          filtered.push(records[i])
        }
      }
    }

    this.setData({ filteredRecords: filtered })
  },

  /* ========== 点击进入详情 ========== */
  goDetail(e) {
    var id = e.currentTarget.dataset.id
    console.log('[list] 点击查看详情, _id:', id)
    wx.navigateTo({ url: '/pages/child/detail/index?id=' + id })
  },

  /* ========== 下拉刷新 ========== */
  onPullDownRefresh() {
    console.log('[list] 下拉刷新触发')
    this.getRecords().finally(function() {
      wx.stopPullDownRefresh()
    })
  }
})
