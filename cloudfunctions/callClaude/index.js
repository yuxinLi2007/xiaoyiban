const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

/**
 * callClaude 云函数
 * 调用 Claude API 提炼就诊摘要
 *
 * 调用参数:
 *   event.text       - 语音识别后的原始文字
 *   event.prompt     - 自定义提示词（可选，默认为就诊摘要模板）
 *   event.userId     - 用户标识，可选
 *   event.audioFileID- 关联的音频文件 ID，可选
 *
 * 需要在数据库 system_config 集合中配置:
 *   claude_apiKey    - Claude API Key
 *   claude_model     - 模型名称（默认 claude-sonnet-4-20250514）
 *   claude_apiUrl    - API 地址（默认 https://api.anthropic.com/v1/messages）
 */
exports.main = async (event, context) => {
  const { text, prompt, userId, audioFileID } = event;
  const wxContext = cloud.getWXContext();
  const openid = userId || wxContext.OPENID;

  if (!text) {
    return { success: false, errMsg: "text 参数为必填" };
  }

  try {
    // 获取 Claude 配置
    const configDoc = await db
      .collection("system_config")
      .doc("claude")
      .get();
    const config = configDoc.data;

    const API_KEY = config.apiKey;
    const MODEL = config.model || "claude-sonnet-4-20250514";
    const API_URL = config.apiUrl || "https://api.anthropic.com/v1/messages";

    if (!API_KEY) {
      return { success: false, errMsg: "Claude API 配置缺失，请在 system_config 集合中配置" };
    }

    // 默认提示词：就诊摘要模板
    const systemPrompt = prompt || `你是一位专业的医疗助手。请根据以下患者口述内容，提炼出结构化的就诊摘要。
请按以下格式输出：

## 就诊摘要
- **主诉**：（患者主要症状和持续时间）
- **现病史**：（症状详情、发病过程）
- **既往史**：（过往相关病史，如有提及）
- **过敏史**：（药物/食物过敏，如有提及）
- **初步建议**：（就医建议和注意事项）

⚠️ 注意：此摘要仅供参考，不构成医疗诊断，请及时就医。`;

    // 调用 Claude API
    const https = require("https");
    const requestBody = JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: "user", content: text },
      ],
    });

    const response = await new Promise((resolve, reject) => {
      const urlObj = new URL(API_URL);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(requestBody),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Claude API 响应解析失败: ${data}`));
          }
        });
      });

      req.on("error", reject);
      req.write(requestBody);
      req.end();
    });

    // 提取 Claude 回复文本
    let summaryText = "";
    if (response.content && response.content.length > 0) {
      summaryText = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
    }

    if (!summaryText) {
      return { success: false, errMsg: "Claude API 未返回有效内容", rawResponse: response };
    }

    // 将摘要写入数据库
    const dbResult = await db.collection("reports").add({
      data: {
        openid,
        audioFileID: audioFileID || "",
        originalText: text,
        summary: summaryText,
        model: MODEL,
        createdAt: db.serverDate(),
      },
    });

    return {
      success: true,
      reportId: dbResult._id,
      summary: summaryText,
    };
  } catch (err) {
    return { success: false, errMsg: err.message || err };
  }
};
