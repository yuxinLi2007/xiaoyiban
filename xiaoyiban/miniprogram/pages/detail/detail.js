Page({
  data: {
    deptName: '',
    doctorName: '',
    statusText: '已完成',
    hospitalName: '',
    visitTime: '',
    summaryText: '',
    transcriptText: '',
    // 语音播报状态: idle(默认) / loading(生成中) / playing(播放中)
    voiceState: 'idle',
    voiceBtnText: '📢 家人语音播报'
  },

  onLoad(options) {
    this.setData({
      deptName: options.dept || '未知科室',
      doctorName: options.doctor || '未知医生',
      hospitalName: options.hospital || '未知医院',
      visitTime: options.time || '未知时间',
      summaryText: '（示例摘要）患者血压控制良好，建议继续服用降压药，低盐饮食，每月复查一次。',
      transcriptText: '医生：最近血压怎么样？\n患者：早上量是130/85。\n医生：还不错，药要按时吃...'
    });
  },

  /**
   * 家人语音播报 — 模拟 TTS 生成 + 播放流程
   * 后续接入真实 TTS/音频播放时只需替换本方法内部逻辑
   */
  playVoiceBroadcast() {
    // 第 1 阶段：显示"正在生成家人叮嘱..."（模拟 TTS 生成）
    this.setData({
      voiceState: 'loading',
      voiceBtnText: '正在生成家人叮嘱...'
    });

    // 第 2 阶段：1.5 秒后切换为"播放中..."（模拟音频播放）
    setTimeout(() => {
      this.setData({
        voiceState: 'playing',
        voiceBtnText: '▶ 播放中...'
      });
    }, 1500);

    // 第 3 阶段：再 2 秒后播报完成，恢复默认状态
    setTimeout(() => {
      this.setData({
        voiceState: 'idle',
        voiceBtnText: '📢 家人语音播报'
      });
      wx.showToast({ title: '播报完成', icon: 'none', duration: 1500 });
    }, 3500);
  }
});
