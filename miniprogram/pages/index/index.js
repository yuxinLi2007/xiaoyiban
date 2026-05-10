// pages/index/index.js
Page({
  data: {
    // 用药提醒：是否已标记服用
    medicineDone: false
  },

  /**
   * 标记"我吃过了" → 变为"✔ 已服用"
   */
  markMedicineDone() {
    this.setData({ medicineDone: true });
    wx.showToast({
      title: '已记录服药 ✔',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 分享今日提醒给子女 — 功能开发中
   */
  shareTipToChildren() {
    wx.showToast({
      title: '功能开发中，敬请期待',
      icon: 'none',
      duration: 2000
    });
  }
});
