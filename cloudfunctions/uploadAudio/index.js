const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

/**
 * uploadAudio 云函数 — 对齐《小医陪-接口协议V1.0》
 * 
 * 入参：
 *   event.fileID  — 必填，云存储中的音频文件ID（前端/ESP32上传后拿到的）
 *   event.format — 可选，音频格式，默认 "m4a"
 *   event.userId — 必填，老人的 _id（elders集合中的_id）
 *
 * 出参（成功）：
 *   { code: 0, data: { fileID, recordId } }
 *
 * 出参（失败）：
 *   { code: -1, errMsg: "错误描述" }
 */
exports.main = async (event) => {
  const { fileID, format = "m4a", userId } = event;

  // --- 1. 参数校验 ---
  if (!fileID || !userId) {
    return {
      code: -1,
      errMsg: "缺少必填参数：fileID 或 userId"
    };
  }

  // 可选：校验格式是否合法
  const allowedFormats = ["mp3", "m4a", "wav", "pcm"];
  if (!allowedFormats.includes(format)) {
    return {
      code: -1,
      errMsg: `不支持的音频格式：${format}，支持：${allowedFormats.join(", ")}`
    };
  }

  try {
    // --- 2. 在 records 集合创建就诊记录 ---
    const result = await db.collection("records").add({
      data: {
        userId: userId,           // 关联老人ID
        audioFileID: fileID,      // 云存储文件ID
        format: format,           // 音频格式
        date: db.serverDate(),    // 服务器时间
        isNew: true,              // 新记录，子女端显示未读
        transcript: "",           // 待 callXunfei 回填
        diagnosis: "",
        medicine: "",
        followUp: "",
        advice: ""
      }
    });

    // --- 3. 按协议返回 ---
    return {
      code: 0,
      data: {
        fileID: fileID,
        recordId: result._id    // 新增记录的_id，可传给callXunfei
      }
    };

  } catch (err) {
    return {
      code: -1,
      errMsg: err.message || "uploadAudio 执行失败"
    };
  }
};