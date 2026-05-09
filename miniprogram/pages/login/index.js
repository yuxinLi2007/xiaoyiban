// pages/login/index.js — 子女端登录页

Page({
  data: {
    statusBarHeight: 44,

    busy: false,
    agreed: true,

    showPhoneForm: false,
    phone: '',
    code: '',
    counting: false,
    countdown: 60
  },

  onLoad() {
    const sys = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sys.statusBarHeight || 44 })
  },

  /* ====== 协议勾选 ====== */
  toggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  /* ====== 检查协议 ====== */
  _checkAgree() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意协议', icon: 'none' })
      return false
    }
    return true
  },

  /* ====== 微信一键登录 ====== */
  doWechatLogin() {
    if (!this._checkAgree()) return
    if (this.data.busy) return

    this.setData({ busy: true })

    /* ---- 真实接入时取消注释 ---- *
     * wx.login({
     *   success(res) { ... }
     * })
     *
     * wx.cloud.callFunction({
     *   name: 'login',
     *   data: {},
     *   success: res => { ... },
     *   fail: err => { ... }
     * })
     */

    // 模拟登录成功
    setTimeout(() => {
      wx.showToast({ title: '登录成功', icon: 'success' })
      this.setData({ busy: false })

      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/index' })
      }, 800)
    }, 1200)
  },

  /* ====== 打开手机号表单 ====== */
  openPhoneLogin() {
    if (!this._checkAgree()) return
    this.setData({ showPhoneForm: true })
  },

  closePhoneLogin() {
    this.setData({
      showPhoneForm: false,
      phone: '',
      code: ''
    })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value.replace(/\D/g, '') })
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value.replace(/\D/g, '') })
  },

  /* ====== 发送验证码（模拟）====== */
  sendCode() {
    const phone = this.data.phone
    if (!phone || phone.length !== 11) {
      return wx.showToast({ title: '请输入正确手机号', icon: 'none' })
    }
    if (this.data.counting) return

    wx.showToast({ title: '验证码已发送', icon: 'none' })

    this.setData({ counting: true, countdown: 60 })
    this._timer = setInterval(() => {
      let n = this.data.countdown - 1
      if (n <= 0) {
        clearInterval(this._timer)
        this.setData({ counting: false, countdown: 60 })
      } else {
        this.setData({ countdown: n })
      }
    }, 1000)
  },

  /* ====== 手机号提交 ====== */
  doPhoneLogin() {
    const p = this.data.phone
    const c = this.data.code

    if (!p || p.length !== 11) {
      return wx.showToast({ title: '请输入正确手机号', icon: 'none' })
    }
    if (!c || c.length < 4) {
      return wx.showToast({ title: '请输入验证码', icon: 'none' })
    }
    if (!this._checkAgree()) return

    /* ---- 真实接入时替换 ---- *
     * wx.request({
     *   url: 'https://api.xxx.com/login',
     *   method: 'POST',
     *   data: { phone, code },
     *   ...
     * })
     */

    wx.showLoading({ title: '登录中...' })
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/index' })
      }, 800)
    }, 1000)
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
  }
})
