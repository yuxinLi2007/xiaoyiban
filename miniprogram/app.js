// app.js
App({
  globalData: {
    env: 'cloudbase-d7gtr74bw289f62e6',
    isLoggedIn: false,
    openid: null,
    familyId: null,
    elderId: '',       // 当前老人ID（elders 集合 _id），老人端核心身份
    role: '',          // 角色：'elder' 老人端 / 'child' 子女端
    preSelectElderId: ''
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error('【app】wx.cloud 不存在，请使用 2.2.3+ 基础库')
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true
      })
      console.log('【app】wx.cloud.init 成功, env:', this.globalData.env)
    }

    // 2. 从本地缓存恢复登录状态
    this._restoreLoginState()
  },

  _restoreLoginState() {
    try {
      const cachedFamilyId = wx.getStorageSync('familyId')
      const cachedOpenid = wx.getStorageSync('openid')
      const cachedElderId = wx.getStorageSync('elderId')
      const cachedRole = wx.getStorageSync('role')
      console.log('【app】_restoreLoginState, familyId:', cachedFamilyId, 'openid:', cachedOpenid, 'elderId:', cachedElderId, 'role:', cachedRole)

      if (cachedFamilyId) {
        this.globalData.familyId = cachedFamilyId
        this.globalData.isLoggedIn = true
      }
      if (cachedOpenid) {
        this.globalData.openid = cachedOpenid
      }
      if (cachedElderId) {
        this.globalData.elderId = cachedElderId
      }
      if (cachedRole) {
        this.globalData.role = cachedRole
      }

      if (this.globalData.isLoggedIn) {
        console.log('【app】登录状态已恢复')
      }
    } catch (e) {
      console.error('【app】读取缓存失败', e)
    }
  },

  setLoggedIn(familyId, openid, extra = {}) {
    console.log('【app】setLoggedIn, familyId:', familyId, 'openid:', openid, 'extra:', extra)

    this.globalData.isLoggedIn = true
    this.globalData.familyId = familyId
    if (openid) {
      this.globalData.openid = openid
    }
    if (extra.elderId) {
      this.globalData.elderId = extra.elderId
    }
    if (extra.role) {
      this.globalData.role = extra.role
    }

    try {
      wx.setStorageSync('familyId', familyId || '')
      if (openid) {
        wx.setStorageSync('openid', openid)
      }
      if (extra.elderId) {
        wx.setStorageSync('elderId', extra.elderId)
      }
      if (extra.role) {
        wx.setStorageSync('role', extra.role)
      }
    } catch (e) {
      console.error('【app】写入缓存失败', e)
    }

    console.log('【app】登录状态已设置完成, isLoggedIn=true, elderId:', this.globalData.elderId)
  },

  clearLoginState() {
    this.globalData.isLoggedIn = false
    this.globalData.familyId = null
    this.globalData.openid = null
    this.globalData.elderId = ''
    this.globalData.role = ''

    try {
      wx.removeStorageSync('familyId')
      wx.removeStorageSync('openid')
      wx.removeStorageSync('elderId')
      wx.removeStorageSync('role')
    } catch (e) {}

    console.log('【app】登录状态已清除')
  }
})
