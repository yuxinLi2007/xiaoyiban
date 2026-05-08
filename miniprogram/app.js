// app.js - 全局登录态管理中心

App({
  globalData: {
    env: 'cloudbase-d7gtr74bw289f62e6',
    isLoggedIn: false,
    familyId: null,
    preSelectElderId: ''
  },

  onLaunch: function () {
    console.log('【app】onLaunch 开始')

    // 1. 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true
      })
      console.log('【app】wx.cloud.init 成功, env:', this.globalData.env)
    } else {
      console.error('【app】wx.cloud 不存在，请使用 2.2.3+ 基础库')
    }

    // 2. 从本地缓存恢复登录状态
    this._restoreLoginState()
  },

  _restoreLoginState() {
    try {
      const cachedFamilyId = wx.getStorageSync('familyId')
      const cachedOpenid = wx.getStorageSync('openid')
      console.log('【app】_restoreLoginState, familyId:', cachedFamilyId, 'openid:', cachedOpenid)

      if (cachedFamilyId) {
        this.globalData.familyId = cachedFamilyId
        this.globalData.isLoggedIn = true
        console.log('【app】登录状态已恢复')
      }
    } catch (e) {
      console.error('【app】读取缓存失败', e)
    }
  },

  setLoggedIn(familyId, openid) {
    console.log('【app】setLoggedIn, familyId:', familyId)

    this.globalData.isLoggedIn = true
    this.globalData.familyId = familyId

    try {
      wx.setStorageSync('familyId', familyId || '')
      if (openid) {
        wx.setStorageSync('openid', openid)
      }
    } catch (e) {
      console.error('【app】写入缓存失败', e)
    }

    console.log('【app】登录状态已设置完成, isLoggedIn=true')
  },

  clearLoginState() {
    this.globalData.isLoggedIn = false
    this.globalData.familyId = null

    try {
      wx.removeStorageSync('familyId')
      wx.removeStorageSync('openid')
    } catch (e) {}

    console.log('【app】登录状态已清除')
  }
})
