/**
 * 报告接收首页
 * 功能：展示就诊记录列表、按家人筛选、未读标记联动
 */

Page({
  data: {
    nickname: '小明',
    todayDate: '',
    totalUnread: 0,
    activeFilter: 'all',
    filters: [],
    displayList: [],
    loading: true,

    // Mock 数据
    mockData: [
      {
        _id: 'f001',
        elderKey: 'father',
        diagnosis: '原发性高血压 II期',
        date: '2026-05-05',
        doctor: '李国华 主任医师',
        department: '心血管内科',
        medicine: '硝苯地平缓释片 30mg 每日一次',
        followUp: '建议两周后复诊，监测血压变化',
        isNew: true,
        avatarIcon: '👨',
        avatarBg: 'linear-gradient(135deg,#D4C4E8,#E8E0F4)'
      },
      {
        _id: 'f002',
        elderKey: 'father',
        diagnosis: '高脂血症',
        date: '2026-04-18',
        doctor: '王建民 副主任医师',
        department: '内分泌科',
        medicine: '',
        followUp: '',
        isNew: false,
        avatarIcon: '👨',
        avatarBg: 'linear-gradient(135deg,#D4C4E8,#E8E0F4)'
      },
      {
        _id: 'f003',
        elderKey: 'father',
        diagnosis: '年度健康体检',
        date: '2026-03-10',
        doctor: '赵敏 医师',
        department: '体检中心',
        medicine: '',
        followUp: '',
        isNew: false,
        avatarIcon: '👨',
        avatarBg: 'linear-gradient(135deg,#D4C4E8,#E8E0F4)'
      },
      {
        _id: 'm001',
        elderKey: 'mother',
        diagnosis: '2型糖尿病 初诊',
        date: '2026-04-28',
        doctor: '陈丽华 主任医师',
        department: '内分泌科',
        medicine: '二甲双胍 0.5g 每日三次 餐前服用',
        followUp: '一周后复查空腹血糖及糖化血红蛋白',
        isNew: true,
        avatarIcon: '👩',
        avatarBg: 'linear-gradient(135deg,#F0DEE4,#F8EEF2)'
      },
      {
        _id: 'm002',
        elderKey: 'mother',
        diagnosis: '腰椎间盘突出',
        date: '2026-03-22',
        doctor: '刘伟 副主任医师',
        department: '骨科',
        medicine: '',
        followUp: '注意卧床休息，避免弯腰负重',
        isNew: false,
        avatarIcon: '👩',
        avatarBg: 'linear-gradient(135deg,#F0DEE4,#F8EEF2)'
      }
    ]
  },

  onLoad() {
    this.setTodayDate()
    this.buildFilters()
    this.loadReports()
  },

  onPullDownRefresh() {
    this.loadReports().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  /* ========== 设置今日日期 ========== */
  setTodayDate() {
    var now = new Date()
    var month = now.getMonth() + 1
    var day = now.getDate()
    var weekDays = ['周日','周一','周二','周三','周四','周五','周六']
    this.setData({
      todayDate: month + '月' + day + '日 ' + weekDays[now.getDay()]
    })
  },

  /* ========== 构建筛选标签 ========== */
  buildFilters() {
    var data = this.data.mockData
    var fatherCount = data.filter(function(r) { return r.elderKey === 'father' }).length
    var motherCount = data.filter(function(r) { return r.elderKey === 'mother' }).length

    this.setData({
      filters: [
        { key: 'all', label: '全部', count: undefined },
        { key: 'father', label: '父亲', count: fatherCount },
        { key: 'mother', label: '母亲', count: motherCount }
      ]
    })
  },

  /* ========== 加载报告数据 ========== */
  loadReports() {
    var self = this
    this.setData({ loading: true })

    // 模拟网络请求延迟
    return new Promise(function(resolve) {
      setTimeout(function() {
        var allData = self.data.mockData
        var unreadTotal = allData.filter(function(r) { return r.isNew === true }).length

        self.setData({
          totalUnread: unreadTotal,
          loading: false
        })

        self.applyFilter()

        resolve()
      }, 400)
    })
  },

  /* ========== 切换筛选 ========== */
  onFilterTap(e) {
    var key = e.currentTarget.dataset.key
    this.setData({ activeFilter: key })
    this.applyFilter()
  },

  applyFilter() {
    var key = this.data.activeFilter
    var all = this.data.mockData
    var filtered = []

    if (key === 'all') {
      filtered = all
    } else {
      for (var i = 0; i < all.length; i++) {
        if (all[i].elderKey === key) {
          filtered.push(all[i])
        }
      }
    }

    this.setData({ displayList: filtered })
  },

  /* ========== 点击卡片 ========== */
  onCardTap(e) {
    var id = e.currentTarget.dataset.id
    console.log('[report] 点击卡片, id:', id)

    wx.showToast({
      title: '详情页开发中',
      icon: 'none',
      duration: 1500
    })
  }
})
