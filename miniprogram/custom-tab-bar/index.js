const app = getApp()

Component({
  data: {
    selected: 0,
    role: 'child', // 'elder' 或 'child'
    // 子女端 Tab 列表
    childList: [
      {
        pagePath: '/pages/home/index',
        text: '首页',
        icon: '🏠',
        activeIcon: '🏠'
      },
      {
        pagePath: '/pages/list/index',
        text: '就诊记录',
        icon: '📋',
        activeIcon: '📋'
      }
    ],
    // 老人端 Tab 列表
    elderList: [
      {
        pagePath: '/pages/index/index',
        text: '今日提醒',
        icon: '🔔',
        activeIcon: '🔔'
      },
      {
        pagePath: '/pages/record/record',
        text: '录音',
        icon: '🎙️',
        activeIcon: '🎙️'
      },
      {
        pagePath: '/pages/history/history',
        text: '历史记录',
        icon: '📖',
        activeIcon: '📖'
      },
      {
        pagePath: '/pages/settings/settings',
        text: '设置',
        icon: '⚙️',
        activeIcon: '⚙️'
      }
    ]
  },

  lifetimes: {
    attached() {
      this.refreshRole()
    }
  },

  pageLifetimes: {
    show() {
      this.refreshRole()
    }
  },

  methods: {
    /** 从全局读取角色 */
    refreshRole() {
      const role = app.globalData.role || wx.getStorageSync('role') || 'child'
      this.setData({ role })
    },

    /** 切换 Tab */
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({ url })
    },

    /** 供页面调用，更新选中状态 */
    updateSelected(idx) {
      this.setData({ selected: idx })
    }
  }
})
