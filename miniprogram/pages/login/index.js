// pages/login/index.js - 登录页

Page({
  data: {
    avatarUrl: '',
    busy: false
  },

  onLoad() {
    console.log('[login] onLoad 触发')
  },

  onShow() {
    console.log('[login] onShow 触发, busy:', this.data.busy)
  },

  onChooseAvatar(e) {
    console.log('[login] 选择头像')
    this.setData({ avatarUrl: e.detail.avatarUrl })
  },

  doLogin() {
    console.log('[login] doLogin 被调用, busy:', this.data.busy)

    if (this.data.busy) return
    this.setData({ busy: true })

    console.log('[login] 开始调用云函数 login...')

    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[login] 云函数原始返回:', JSON.stringify(res))

        const r = res.result
        console.log('[login] res.result:', JSON.stringify(r))

        if (!r || !r.success) {
          console.error('[login] 云函数返回失败', r)
          wx.showToast({
            title: (r && r.error) || '登录失败',
            icon: 'none',
            duration: 2000
          })
          this.setData({ busy: false })
          return
        }

        const openid = r.openid || ''
        const familyId = r.familyId || ''

        console.log('[login] 登录成功! openid:', openid, 'familyId:', familyId)

        // 写入全局 + 缓存
        const app = getApp()
        app.setLoggedIn(familyId, openid)

        // 额外确保缓存写入
        try {
          wx.setStorageSync('openid', openid)
          wx.setStorageSync('familyId', familyId)
        } catch (e) {
          console.error('[login] 缓存写入异常', e)
        }

        wx.showToast({ title: '登录成功', icon: 'success' })

        setTimeout(() => {
          console.log('[login] 准备 switchTab 到 /pages/home/index')
          wx.switchTab({
            url: '/pages/home/index'
          })
        }, 800)
      },

      fail: err => {
        console.error('[login] 云函数调用失败:', JSON.stringify(err))
        let msg = '网络异常'

        if (!err) {
          msg = '未知错误'
        } else if (err.errCode === -1) {
          msg = '网络连接失败，请检查网络'
        } else if (err.errCode === 404011) {
          msg = '云函数不存在，请联系管理员'
        } else if (err.errCode === 404008) {
          msg = '无权限调用云函数'
        } else if (err.errMsg) {
          msg = err.errMsg
        }

        console.error('[login] 错误信息:', msg)

        wx.showToast({
          title: msg,
          icon: 'none',
          duration: 3000
        })
        this.setData({ busy: false })
      }
    })
  }
})
