// pages/login/index.js — 子女端登录页

const app = getApp()

Page({
  data: {
    statusBarHeight: 44,

    busy: false,
    agreed: true,
    role: 'child', // 默认子女端，可选 'elder'

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

  /* ====== 角色选择 ====== */
  selectRole(e) {
    this.setData({ role: e.currentTarget.dataset.role })
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
    wx.showLoading({ title: '登录中...' })

    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: async (res) => {
        wx.hideLoading()
        const result = res.result

        if (!result.success) {
          this.setData({ busy: false })
          wx.showToast({ title: result.error || '登录失败', icon: 'none' })
          return
        }

        // 登录成功，写入全局状态（使用选择的角色）
        const selectedRole = this.data.role
        app.setLoggedIn(result.familyId, result.openid, { role: selectedRole })

        // 尝试查询该家庭下第一个老人，作为默认 elderId
        try {
          const elderRes = await wx.cloud.database().collection('elders')
            .where({ familyId: result.familyId })
            .limit(1)
            .get()
          if (elderRes.data.length > 0) {
            app.globalData.elderId = elderRes.data[0]._id
            wx.setStorageSync('elderId', elderRes.data[0]._id)
          }
        } catch (e) {
          console.warn('[login] 查询老人信息失败，不影响使用:', e)
        }

        this.setData({ busy: false })
        wx.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          // 根据角色跳转不同首页
          if (selectedRole === 'elder') {
            wx.switchTab({ url: '/pages/index/index' })
          } else {
            wx.switchTab({ url: '/pages/home/index' })
          }
        }, 800)
      },
      fail: (err) => {
        wx.hideLoading()
        this.setData({ busy: false })
        console.error('[login] 云函数调用失败:', err)
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
      }
    })
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

  /* ====== 手机号提交（走同一套云函数登录）====== */
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

    // 手机号登录同样走云函数 login（微信小程序中 openid 由云函数自动获取）
    this.doWechatLogin()
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
  }
})
