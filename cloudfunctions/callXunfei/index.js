const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * callXunfei 云函数（联调版）
 * 为快速打通主链路，此版本使用模拟数据，确保后续流程能立刻验证
 *
 * 当你在 system_config 集合中配置真实的讯飞密钥后，
 * 可以联系我把此版本升级为调用真实讯飞 WebSocket API 的生产版本
 */
// callXunfei 修改（在现有模拟代码基础上调整）
exports.main = async (event) => {
  const { fileID, recordId, language = "auto" } = event;

  if (!fileID) {
    return { code: -1, errMsg: "缺少必填参数：fileID" };
  }

  try {
    const mockText = `医生：最近血压怎么样？...`;
    const mockDuration = 28;

    // 精准更新：优先用 recordId
    if (recordId) {
      await db.collection("records").doc(recordId).update({
        data: { transcript: mockText, duration: mockDuration }
      });
    } else {
      // 兜底：用 fileID 查找
      const records = await db.collection("records")
        .where({ audioFileID: fileID })
        .orderBy("date", "desc")
        .limit(1)
        .get();
      if (records.data.length > 0) {
        await db.collection("records").doc(records.data[0]._id).update({
          data: { transcript: mockText, duration: mockDuration }
        });
      }
    }

    return { code: 0, data: { text: mockText, duration: mockDuration } };
  } catch (err) {
    return { code: -1, errMsg: err.message || "callXunfei 执行失败" };
  }
};