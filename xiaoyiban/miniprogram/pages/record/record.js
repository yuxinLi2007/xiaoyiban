// pages/record/record.js
const recorderManager = wx.getRecorderManager();
const innerAudioContext = wx.createInnerAudioContext();

Page({
  data: {
    isRecording: false,
    buttonText: '点击开始录音',
    audioPath: ''
  },

  onLoad() {
    // 监听录音结束
    recorderManager.onStop((res) => {
      this.setData({
        isRecording: false,
        buttonText: '录音完成',
        audioPath: res.tempFilePath
      });
    });

    // 录音错误处理
    recorderManager.onError((err) => {
      console.error('录音错误', err);
      this.setData({
        isRecording: false,
        buttonText: '点击开始录音'
      });
      wx.showToast({ title: '录音失败，请重试', icon: 'none' });
    });

    // 音频播放错误处理
    innerAudioContext.onError((err) => {
      console.error('播放失败', err);
      wx.showToast({
        title: '播放失败，模拟器不支持录音播放，请使用真机测试',
        icon: 'none',
        duration: 3000
      });
    });
  },

  toggleRecord() {
    if (this.data.isRecording) {
      recorderManager.stop();
    } else {
      wx.authorize({ scope: 'scope.record' }).then(() => {
        recorderManager.start({
          duration: 600000,
          sampleRate: 16000,
          format: 'mp3'
        });
        this.setData({
          isRecording: true,
          buttonText: '录音中... 点击结束'
        });
      }).catch(() => {
        wx.showToast({ title: '请授权录音权限', icon: 'none' });
      });
    }
  },

  /**
   * 播放录音 — 模拟器无法播放录音文件，请使用真机预览测试
   */
  playAudio() {
    if (!this.data.audioPath) {
      wx.showToast({ title: '暂无录音可播放', icon: 'none' });
      return;
    }
    // 提示：模拟器中无法播放录音文件
    wx.showToast({
      title: '正在播放...（模拟器不支持，请用真机测试）',
      icon: 'none',
      duration: 2000
    });
    innerAudioContext.src = this.data.audioPath;
    innerAudioContext.play();
  },

  finishRecord() {
    if (!this.data.audioPath) {
      wx.showToast({ title: '请先完成录音', icon: 'none' });
      return;
    }
    // 存入全局变量，方便其他页面使用
    getApp().globalData.tempAudioPath = this.data.audioPath;
    wx.showToast({ title: '录音已保存', icon: 'success' });
    setTimeout(() => { wx.navigateBack(); }, 1500);
  }
});
