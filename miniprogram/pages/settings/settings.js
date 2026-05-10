// pages/settings/settings.js
Page({
  data: {
    pushEnabled: true // 微信推送开关状态
  },

  /**
   * 绑定子女设备 — 弹出模态框提示
   */
  bindDevice() {
    wx.showModal({
      title: '温馨提示',
      content: '绑定功能即将上线，敬请期待',
      confirmText: '知道了',
      showCancel: false
    });
  },

  /**
   * 微信推送开关切换
   */
  togglePush(e) {
    const isOn = e.detail.value;
    this.setData({ pushEnabled: isOn });
    wx.showToast({
      title: isOn ? '已开启推送' : '已关闭推送',
      icon: 'none',
      duration: 1500
    });
  }
});
