const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    return { success: false, error: '无法获取用户身份' }
  }

  try {
    // 查询 families 集合中是否已存在该用户的家庭记录
    const existRes = await db.collection('families')
      .where({ ownerOpenId: OPENID })
      .get()

    let familyId

    if (existRes.data.length > 0) {
      // 已存在家庭记录，直接返回
      familyId = existRes.data[0]._id
    } else {
      // 不存在则自动创建家庭记录
      const addRes = await db.collection('families').add({
        data: {
          ownerOpenId: OPENID,
          familyName: '我的家庭',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      familyId = addRes._id
    }

    return {
      success: true,
      openid: OPENID,
      familyId: familyId
    }
  } catch (err) {
    console.error('【login 云函数】错误:', err)
    return { success: false, error: err.message || '登录失败' }
  }
}
