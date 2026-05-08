const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 标记就诊记录为已读
 * 前端传入记录 _id，服务端以管理员权限更新 isNew = false
 */
exports.main = async (event, context) => {
  const { id } = event

  console.log('[markRead] 收到请求, id:', id)

  if (!id) {
    return { success: false, error: '缺少记录ID', code: 'MISSING_ID' }
  }

  try {
    // 先查询确认记录存在
    const recordRes = await db.collection('records').doc(id).get()
    if (!recordRes.data) {
      return { success: false, error: '记录不存在', code: 'NOT_FOUND' }
    }

    console.log('[markRead] 找到记录, 当前 isNew:', recordRes.data.isNew)

    // 以管理员权限更新（云函数默认拥有数据库全部权限）
    const updateRes = await db.collection('records').doc(id).update({
      data: {
        isNew: false,
        readAt: new Date()   // 记录阅读时间，方便后续排查
      }
    })

    console.log('[markRead] 更新成功, stats:', JSON.stringify(updateRes.stats))

    return {
      success: true,
      updated: updateRes.stats.updated,
      previousIsNew: recordRes.data.isNew
    }

  } catch (err) {
    console.error('[markRead] 错误:', err)

    // 分类错误码返回给前端
    let errorCode = 'UNKNOWN'
    if (err.errCode === -1) errorCode = 'NETWORK_ERROR'
    else if (String(err.errMsg || '').indexOf('not exist') > -1) errorCode = 'NOT_FOUND'

    return {
      success: false,
      error: err.message || err.errMsg || '更新失败',
      code: errorCode,
      errCode: err.errCode
    }
  }
}
