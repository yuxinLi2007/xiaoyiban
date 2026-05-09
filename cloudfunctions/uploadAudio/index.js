const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

/**
 * uploadAudio 云函数
 * 接收音频文件存云存储，并写入数据库记录
 *
 * 调用参数:
 *   event.fileContent  - Base64 编码的音频文件内容
 *   event.fileName     - 文件名（如 recording.mp3）
 *   event.format       - 音频格式（如 mp3/wav/pcm），默认 mp3
 *   event.duration     - 录音时长（秒），可选
 *   event.userId       - 用户标识，可选（不传则用 openid）
 */
exports.main = async (event, context) => {
  const { fileContent, fileName, format = "mp3", duration, userId } = event;
  const wxContext = cloud.getWXContext();
  const openid = userId || wxContext.OPENID;

  if (!fileContent || !fileName) {
    return { success: false, errMsg: "fileContent 和 fileName 为必填参数" };
  }

  try {
    // Base64 解码为 Buffer
    const buffer = Buffer.from(fileContent, "base64");

    // 生成云存储路径: audio/{openid}/{timestamp}_{fileName}
    const timestamp = Date.now();
    const cloudPath = `audio/${openid}/${timestamp}_${fileName}`;

    // 上传到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath,
      fileContent: buffer,
    });

    // 写入数据库记录
    const record = {
      openid,
      fileID: uploadResult.fileID,
      cloudPath,
      fileName,
      format,
      duration: duration || 0,
      createdAt: db.serverDate(),
    };

    const dbResult = await db.collection("audios").add({ data: record });

    return {
      success: true,
      fileID: uploadResult.fileID,
      recordId: dbResult._id,
      cloudPath,
    };
  } catch (err) {
    return { success: false, errMsg: err.message || err };
  }
};
