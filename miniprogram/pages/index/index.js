// pages/index/index.js — 老人端首页「今日提醒」

const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    elderName: '',
    medicineDone: false,
    loading: true,

    // 用药提醒（可多条）
    medicines: [],
    // 复诊提醒
    visits: [],
    // 健康小贴士
    tip: ''
  },

  onShow() {
    // 设置自定义 tabBar 选中状态（老人端今日提醒 = index 0）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this.loadReminders()
  },

  /** 加载提醒数据 */
  async loadReminders() {
    this.setData({ loading: true })

    const elderId = app.globalData.elderId || wx.getStorageSync('elderId') || ''

    // 1. 查询老人姓名
    if (elderId) {
      try {
        const elderRes = await db.collection('elders').doc(elderId).get()
        if (elderRes.data) {
          this.setData({ elderName: elderRes.data.name || '' })
        }
      } catch (e) {
        console.warn('[index] 查询老人信息失败:', e)
      }
    }

    // 2. 查询用药提醒（从 reminders 集合，type='medicine'）
    let medicines = []
    try {
      const medRes = await db.collection('reminders')
        .where({
          elderId: elderId,
          type: 'medicine'
        })
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
      medicines = medRes.data.map(m => ({
        _id: m._id,
        name: m.name || '药品',
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        done: m.done || false
      }))
    } catch (e) {
      console.warn('[index] 查询用药提醒失败，使用兜底数据:', e)
    }

    // 如果没有真实数据，提供兜底
    if (medicines.length === 0) {
      medicines = [{
        _id: 'default_med',
        name: '降压药（硝苯地平）',
        dosage: '每次1片',
        frequency: '每日1次',
        done: false
      }]
    }

    // 3. 查询复诊提醒（type='visit'）
    let visits = []
    try {
      const visitRes = await db.collection('reminders')
        .where({
          elderId: elderId,
          type: 'visit'
        })
        .orderBy('date', 'asc')
        .limit(10)
        .get()
      visits = visitRes.data.map(v => ({
        _id: v._id,
        name: v.name || '复诊',
        dateText: this._formatDate(v.date),
        department: v.department || ''
      }))
    } catch (e) {
      console.warn('[index] 查询复诊提醒失败，使用兜底数据:', e)
    }

    if (visits.length === 0) {
      // 从最近 records 取最近的科室作为复诊提醒
      try {
        const recRes = await db.collection('records')
          .where({ elderId: elderId })
          .orderBy('date', 'desc')
          .limit(1)
          .get()
        if (recRes.data.length > 0) {
          const r = recRes.data[0]
          visits = [{
            _id: 'from_record',
            name: (r.department || '') + '复诊',
            dateText: '请遵医嘱按时复诊',
            department: r.department || ''
          }]
        }
      } catch (e) {
        console.warn('[index] 从记录取复诊提醒失败:', e)
      }
    }

    if (visits.length === 0) {
      visits = [{
        _id: 'default_visit',
        name: '心内科复诊',
        dateText: '2024年6月20日 上午 09:30',
        department: '心内科'
      }]
    }

    // 4. 健康小贴士（随机展示一条）
    const tips = [
      '低盐饮食：每日食盐不超过6克',
      '适量运动：每天散步30分钟有助于心血管健康',
      '规律作息：保证7-8小时充足睡眠',
      '定期监测：每天定时测量血压并记录',
      '多喝水：每天饮水1500-1700毫升'
    ]
    const tip = tips[Math.floor(Math.random() * tips.length)]

    this.setData({
      loading: false,
      medicines,
      visits,
      tip
    })
  },

  /** 标记"我吃过了" */
  async markMedicineDone(e) {
    const idx = e.currentTarget.dataset.index
    const med = this.data.medicines[idx]
    const key = `medicines[${idx}].done`

    this.setData({ [key]: true })

    // 尝试更新数据库
    if (med._id && med._id !== 'default_med') {
      try {
        await db.collection('reminders').doc(med._id).update({
          data: { done: true }
        })
      } catch (e) {
        console.warn('[index] 更新用药状态失败:', e)
      }
    }

    wx.showToast({ title: '已记录服药 ✔', icon: 'success', duration: 1500 })
  },

  /** 分享今日提醒给子女 */
  shareTipToChildren() {
    const elderName = this.data.elderName || '长辈'
    const medicines = this.data.medicines.map(m => `${m.name}：${m.frequency}，${m.dosage}${m.done ? '（已服用）' : '（未服用）'}`).join('\n')
    const visits = this.data.visits.map(v => `${v.name}：${v.dateText}`).join('\n')
    const tip = this.data.tip

    const shareText = `【${elderName}的今日提醒】\n\n💊 用药提醒：\n${medicines}\n\n🏥 复诊提醒：\n${visits}\n\n❤️ 健康小贴士：\n${tip}`

    wx.showShareMenu({ withShareTicket: true })
    wx.showModal({
      title: '分享给子女',
      content: shareText,
      confirmText: '复制',
      success(res) {
        if (res.confirm) {
          wx.setClipboardData({
            data: shareText,
            success() {
              wx.showToast({ title: '已复制，可发送给子女', icon: 'success' })
            }
          })
        }
      }
    })
  },

  /** 格式化日期 */
  _formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return String(date)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    const h = d.getHours()
    const min = d.getMinutes().toString().padStart(2, '0')
    const ampm = h < 12 ? '上午' : '下午'
    const h12 = h > 12 ? h - 12 : h
    return `${y}年${m}月${day}日 ${ampm} ${h12}:${min}`
  }
})
