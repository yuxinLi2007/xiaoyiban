/**
 * 详情页 — 自动标记已读 + 展示报告
 *
 * 数据流：
 *   onLoad(id)
 *     ├── markAsRead(id)     ← 更新数据库 isNew=false
 *     └── loadDetail(id)     ← 查询并渲染
 *
 *   onUnload()
 *     └── 通知上一页 getRecords() ← 列表页重新拉取数据库最新数据
 */

const db = wx.cloud.database()

Page({
  data: {
    report: {},
    summary: '',
    id: '',
    loading: true,
    loadError: ''
  },

  onLoad(options) {
    var id = options.id
    console.log('[detail] ===== 进入详情页 =====')
    console.log('[detail] 记录ID:', id)

    if (!id) {
      this.setData({ loading: false, loadError: '缺少记录ID' })
      return
    }

    this.setData({ id: id })

    // ① 标记已读（更新数据库）
    this.markAsRead(id)

    // ② 同时加载详情（并行执行，不互相等待）
    this.loadDetail(id)
  },

  /* ================================================================
   *  核心方法：标记已读
   *  直接用客户端 db.doc().update() 更新数据库
   *  更新成功后通知列表页刷新
   * ================================================================ */
  async markAsRead(id) {
    console.log('[detail] ===== 开始标记已读 =====')
    console.log('[detail] 目标 _id:', id)

    try {
      var res = await db.collection('records').doc(id).update({
        data: {
          isNew: false
        }
      })

      console.log('[detail] ✅ 标记已读成功')
      console.log('[detail]   更新结果:', JSON.stringify(res.stats))

      // 标记成功后，立即通知列表页重新拉取数据
      // 这样用户返回时，红点已经消失
      this.notifyListRefresh()

    } catch (err) {
      console.error('[detail] ❌ 标记失败')
      console.error('[detail]   errCode:', err.errCode || '(无)')
      console.error('[detail]   errMsg:', err.errMsg || err.message || err)

      // 错误码分析
      var errMsg = err.errMsg || ''
      if (errMsg.indexOf('permission') > -1 || errMsg.indexOf('权限') > -1) {
        console.warn('[detail] 原因: 数据库权限不足，建议使用云函数或开放 update 权限')
      } else if (errMsg.indexOf('not found') > -1 || (err.errCode && String(err.errCode).indexOf('40411') > -1)) {
        console.warn('[detail] 原因: 文档不存在')
      } else if (!err.errCode) {
        console.warn('[detail] 原因: 网络异常或云函数未部署')
      }
    }
  },

  /**
   * 通知列表页重新获取数据
   * 通过 getCurrentPages() 获取上一页实例，直接调用其 getRecords()
   */
  notifyListRefresh() {
    var pages = getCurrentPages()
    for (var i = 0; i < pages.length; i++) {
      var page = pages[i]
      // 列表页有 getRecords 方法
      if (typeof page.getRecords === 'function') {
        console.log('[detail] 通知页面刷新:', page.route || ('第' + i + '层'))
        page.getRecords()
      }
      // 首页也有 getData 方法
      if (typeof page.getData === 'function') {
        page.getData(page.data.familyInfo?._id || '')
      }
    }
  },

  /* ========== 加载详情数据 ========== */
  async loadDetail(id) {
    console.log('[detail] ===== 开始查询详情 =====')

    try {
      var res = await db.collection('records').doc(id).get()
      var report = res.data

      // ========== 新增：统一格式化日期字段（防止显示 [object Object]） ==========
      if (report.date) {
        if (typeof report.date === 'string') {
          // 如果已经是字符串，直接保留
          report.date = report.date
        } else {
          // 如果是 serverDate 对象，转为 YYYY-MM-DD 格式
          try {
            var d = new Date(report.date)
            if (!isNaN(d.getTime())) {
              var year = d.getFullYear()
              var month = String(d.getMonth() + 1).padStart(2, '0')
              var day = String(d.getDate()).padStart(2, '0')
              report.date = year + '-' + month + '-' + day
            }
          } catch (e) {
            // 转换失败则置空
            report.date = ''
          }
        }
      }
      // ========== 新增结束 ==========

      if (!report) {
        console.error('[detail] 数据为空')
        this.setData({ loading: false, loadError: '该记录不存在' })
        return
      }

      console.log('[detail] ✅ 详情加载成功')
      console.log('[detail]   isNew:', report.isNew)

      this.setData({
        report: report,
        summary: this.buildSummary(report),
        loading: false,
        loadError: ''
      })

      // 异步补全老人名称
      if (report.elderId) {
        db.collection('elders').doc(report.elderId).get().then(function(elderRes) {
          var elderName = elderRes.data ? elderRes.data.name : ''
          var updatedReport = Object.assign({}, report, { elderName: elderName })
          this.setData({
            report: updatedReport,
            summary: this.buildSummary(updatedReport)
          })
        }.bind(this)).catch(function(err) {
          console.warn('[detail] 补全老人名称失败(不影响主数据):', err.errMsg)
        })
      }

    } catch (err) {
      console.error('[detail] ❌ 查询详情失败')
      console.error('[detail]   errCode:', err.errCode)
      console.error('[detail]   errMsg:', err.errMsg)

      this.setData({
        loading: false,
        loadError: '加载失败'
      })

      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  /* ========== 返回时再次通知刷新 ========== */
  onUnload() {
    console.log('[detail] onUnload → 再次通知刷新')
    this.notifyListRefresh()
  },

  goBack() {
    wx.navigateBack({ fail: function() {
      wx.switchTab({ url: '/pages/list/index' })
    }})
  },

  buildSummary(report) {
    var name = report.elderName || report.name || '患者'
    var diagnosis = report.diagnosis || '待诊断'
    var doctor = report.doctor || '未指定'
    var hospital = report.hospital || '未知医院'
    var advice = report.advice || '遵医嘱'
    var medicine = report.medicine || '暂无用药'
    return name + '本次就诊诊断为' + diagnosis + '，由' + doctor + '在' + hospital + '接诊，建议' + advice + '，需按时服用' + medicine + '。'
  }
})
