const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 讯飞语音识别 WebSocket URL 生成参考:
// https://www.xfyun.cn/doc/asr/voicedictation/API.html

/**
 * callXunfei 云函数
 * 调用讯飞语音识别 API，将音频转为文字
 *
 * 调用参数:
 *   event.fileID     - 云存储中的音频文件 ID
 *   event.audioUrl   - 音频下载链接（二选一，优先 fileID）
 *   event.format     - 音频格式: mp3/wav/pcm 等，默认 mp3
 *   event.engineType - 引擎类型: sms16k/sms8k 等，默认 sms16k
 *
 * 需要在云开发环境变量或数据库中配置:
 *   XUNFEI_APP_ID    - 讯飞应用 APPID
 *   XUNFEI_API_KEY   - 讯飞 API Key
 *   XUNFEI_API_SECRET- 讯飞 API Secret
 */
exports.main = async (event, context) => {
  const { fileID, audioUrl, format = "mp3", engineType = "sms16k" } = event;

  if (!fileID && !audioUrl) {
    return { success: false, errMsg: "fileID 或 audioUrl 为必填参数" };
  }

  try {
    // 获取讯飞配置（从环境变量或数据库读取）
    const configDoc = await db
      .collection("system_config")
      .doc("xunfei")
      .get();
    const config = configDoc.data;

    const APP_ID = config.appId;
    const API_KEY = config.apiKey;
    const API_SECRET = config.apiSecret;

    if (!APP_ID || !API_KEY || !API_SECRET) {
      return { success: false, errMsg: "讯飞 API 配置缺失，请在 system_config 集合中配置" };
    }

    // 如果传的是 fileID，先下载音频文件
    let audioBuffer;
    if (fileID) {
      const downloadResult = await cloud.downloadFile({ fileID });
      audioBuffer = downloadResult.fileContent;
    } else {
      // 通过 URL 下载
      const https = require("https");
      audioBuffer = await new Promise((resolve, reject) => {
        https.get(audioUrl, (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
          res.on("error", reject);
        }).on("error", reject);
      });
    }

    // 生成讯飞鉴权 URL
    const authUrl = generateXunfeiAuthUrl(API_KEY, API_SECRET, engineType);

    // 使用 WebSocket 调用讯飞语音听写 API
    const resultText = await xunfeiSpeechRecognition(authUrl, APP_ID, audioBuffer, format, engineType);

    // 将识别结果写入数据库
    const wxContext = cloud.getWXContext();
    await db.collection("transcriptions").add({
      data: {
        openid: wxContext.OPENID,
        fileID: fileID || "",
        text: resultText,
        format,
        engineType,
        createdAt: db.serverDate(),
      },
    });

    return {
      success: true,
      text: resultText,
    };
  } catch (err) {
    return { success: false, errMsg: err.message || err };
  }
};

/**
 * 生成讯飞鉴权 URL
 */
function generateXunfeiAuthUrl(apiKey, apiSecret, engineType) {
  const crypto = require("crypto");
  const url = "wss://iat-api.xfyun.cn/v2/iat";
  const host = "iat-api.xfyun.cn";
  const path = "/v2/iat";
  const date = new Date().toUTCString();

  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(signatureOrigin)
    .digest("base64");

  const authorization = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const encodedAuth = Buffer.from(authorization).toString("base64");

  return `${url}?authorization=${encodedAuth}&date=${encodeURIComponent(date)}&host=${host}`;
}

/**
 * 调用讯飞语音听写 WebSocket API
 * 将音频分帧发送，接收识别结果
 */
function xunfeiSpeechRecognition(authUrl, appId, audioBuffer, format, engineType) {
  return new Promise((resolve, reject) => {
    const WebSocket = require("ws");
    const ws = new WebSocket(authUrl);

    let resultText = "";
    let frameIndex = 0;
    const FRAME_SIZE = 8000; // 每帧大小（字节）
    const STATUS_FIRST = 0;
    const STATUS_CONTINUE = 1;
    const STATUS_LAST = 2;

    ws.on("open", () => {
      // 发送首帧
      sendFrame(ws, appId, audioBuffer, 0, Math.min(FRAME_SIZE, audioBuffer.length), STATUS_FIRST, format, engineType);
      frameIndex = FRAME_SIZE;
    });

    ws.on("message", (data) => {
      const res = JSON.parse(data);
      if (res.code !== 0) {
        reject(new Error(`讯飞 API 错误: ${res.code} - ${res.message}`));
        ws.close();
        return;
      }

      // 拼接识别文本
      if (res.data && res.data.result) {
        const wsResult = res.data.result.ws;
        for (const item of wsResult) {
          for (const cw of item.cw) {
            resultText += cw.w;
          }
        }
      }

      if (res.data && res.data.status === 2) {
        // 识别完成
        ws.close();
        resolve(resultText);
      } else {
        // 继续发送下一帧
        if (frameIndex < audioBuffer.length) {
          const end = Math.min(frameIndex + FRAME_SIZE, audioBuffer.length);
          const isLast = end >= audioBuffer.length;
          sendFrame(ws, appId, audioBuffer, frameIndex, end, isLast ? STATUS_LAST : STATUS_CONTINUE, format, engineType);
          frameIndex = end;
        } else {
          // 发送结束帧（空音频）
          sendFrame(ws, appId, Buffer.alloc(0), 0, 0, STATUS_LAST, format, engineType);
        }
      }
    });

    ws.on("error", (err) => reject(err));

    // 超时处理
    setTimeout(() => {
      ws.close();
      resolve(resultText || "");
    }, 30000);
  });
}

/**
 * 发送音频帧到讯飞 WebSocket
 */
function sendFrame(ws, appId, audioBuffer, start, end, status, format, engineType) {
  const audioSlice = audioBuffer.slice(start, end).toString("base64");
  const frame = {
    common: { app_id: appId },
    business: {
      language: "zh_cn",
      domain: "iat",
      accent: "mandarin",
      dwa: "wpgs",
      vad_eos: 2000,
    },
    data: {
      status,
      format,
      encoding: "raw",
      audio: audioSlice,
    },
  };
  ws.send(JSON.stringify(frame));
}
