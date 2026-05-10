const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * callHunyuan 云函数（个性化版 — 对齐《小医陪-接口协议V1.0》）
 * 
 * 入参：
 *   event.sourceText  - 必填，语音转写后的文本
 *   event.userId      - 必填，老人ID（用于查找最近一条记录和病史）
 *   event.recordId    - 可选，优先使用精准更新
 *
 * 出参（成功）：
 *   { code: 0, data: { diagnosis, medicine, followUp, advice } }
 */
exports.main = async (event) => {
  const { sourceText, recordId, userId } = event;

  if (!sourceText) {
    return { code: -1, errMsg: "缺少必填参数：sourceText", fallback: sourceText || "" };
  }

  try {
    // ========== 🆕 新增：读取老人病史，生成个性化医嘱 ==========
    let elderInfo = {};
    if (userId) {
      try {
        const elderRes = await db.collection('elders')
          .doc(userId)  // 使用 .doc() 根据 _id 精准查询，更高效
          .get();
        if (elderRes.data) {
          elderInfo = elderRes.data;
          console.log('[callHunyuan] 已读取老人病史:', elderInfo.name, elderInfo.conditions);
        }
      } catch (e) {
        console.warn('[callHunyuan] 读取病史失败，将使用通用模式:', e.message);
      }
    }

    // 根据是否有病史，生成不同的模拟摘要
    const mockSummary = {
      diagnosis: "高血压（血压控制欠佳）",
      medicine: "硝苯地平缓释片 30mg 每日1次",
      followUp: "两周后复查血压",
      advice: elderInfo.conditions 
        ? `低盐低脂饮食，按时服药，每日监测血压。患者有“${elderInfo.conditions}”病史，需特别注意生活习惯。`
        : "低盐低脂饮食，按时服药，每日监测血压",
        doctor: "内科 陈医生",      
        hospital: "市第一人民医院",  
        department: "心内科" 
    };

    // 如果有过敏史，一定要加到医嘱里去！（护城河亮点）
    if (elderInfo.allergies) {
      mockSummary.advice += ` 医嘱：医生开药时，请务必告知医生患者对“${elderInfo.allergies}”过敏。`;
    }
    // ========== 新增结束 ==========

    // 精准更新：优先用 recordId
    if (recordId) {
      await db.collection("records").doc(recordId).update({
        data: { ...mockSummary }
      });
    } else if (userId) {
      // 兜底：用 userId 查找最新记录
      const records = await db.collection("records")
        .where({ userId })
        .orderBy("date", "desc")
        .limit(1)
        .get();
      if (records.data.length > 0) {
        await db.collection("records").doc(records.data[0]._id).update({
          data: { ...mockSummary }
        });
      }
    }

    return { code: 0, data: mockSummary };
  } catch (err) {
    return { code: -1, errMsg: err.message || "AI摘要生成失败", fallback: sourceText };
  }
};