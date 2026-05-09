// pages/history/history.js
Page({
  data: {
    // 模拟数据：与首页保持一致的三笔就诊记录
    records: [
      { id:1, deptName:'心内科', doctorName:'张医生', status:'已完成', hospitalName:'北京协和医院', visitTime:'2024年5月20日 上午 09:30' },
      { id:2, deptName:'呼吸内科', doctorName:'李医生', status:'已完成', hospitalName:'北京协和医院', visitTime:'2024年4月18日 上午 10:15' },
      { id:3, deptName:'内分泌科', doctorName:'王医生', status:'已完成', hospitalName:'北京协和医院', visitTime:'2024年3月22日 下午 14:30' }
    ]
  },

  /**
   * 查看就诊摘要 — 跳转到详情页
   */
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  /**
   * 跳转到录音页
   */
  goToRecord() {
    wx.switchTab({ url: '/pages/record/record' });
  }
});
