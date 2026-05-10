const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

/**
 * sendNotify 云函数
 * 就诊报告生成后微信推送给子女
 *
 * 调用参数:
 *   event.reportId     - 报告记录 ID（reports 集合中的 _id）
 *   event.toUser      - 接收者 openid（子女），可选（不传则查 family_binding）
 *   event.familyId     - 家庭 ID，用于查找绑定的子女，可选
 *   event.summary      - 摘要内容（如不传 reportId，可直接传摘要文本）
 *   event.notifyType   - 通知类型: subscribeMessage / uniformMessage，默认 subscribeMessage
 *
 * 注意:
 *   使用订阅消息需要在小程序后台申请模板并获取 templateId
 *   需在 system_config 集合中配置 notify_templateId
 */
exports.main = async (event, context) => {
  const { reportId, toUser, familyId, summary, notifyType = "subscribeMessage" } = event;

  try {
    let reportSummary = summary || "";
    let targetOpenid = toUser || "";

    // 如果传了 reportId，从数据库读取报告
    if (reportId && !reportSummary) {
      const reportDoc = await db.collection("reports").doc(reportId).get();
      reportSummary = reportDoc.data.summary || "";
      if (!targetOpenid) {
        targetOpenid = reportDoc.data.openid;
      }
    }

    // 如果没指定接收者，通过家庭绑定关系查找子女
    if (!targetOpenid && familyId) {
      const bindingDoc = await db
        .collection("family_bindings")
        .where({ familyId, role: "child" })
        .get();
      if (bindingDoc.data.length > 0) {
        targetOpenid = bindingDoc.data[0].openid;
      }
    }

    if (!targetOpenid) {
      return { success: false, errMsg: "无法确定通知接收者，请提供 toUser 或 familyId" };
    }

    if (!reportSummary) {
      return { success: false, errMsg: "没有可发送的报告内容" };
    }

    // 获取通知模板配置
    const configDoc = await db
      .collection("system_config")
      .doc("notify")
      .get();
    const config = configDoc.data;

    const TEMPLATE_ID = config.templateId;
    if (!TEMPLATE_ID) {
      return { success: false, errMsg: "通知模板 ID 未配置，请在 system_config 集合中配置 notify.templateId" };
    }

    let sendResult;

    if (notifyType === "subscribeMessage") {
      // 发送订阅消息
      sendResult = await cloud.openapi.subscribeMessage.send({
        touser: targetOpenid,
        templateId: TEMPLATE_ID,
        page: `pages/report/detail?id=${reportId || ""}`,
        data: {
          thing1: {
            value: truncate(reportSummary, 20),
          },
          time2: {
            value: formatTime(new Date()),
          },
          thing3: {
            value: "老人就诊报告已生成，请查看详情",
          },
        },
      });
    } else {
      // 统一服务消息（需要 formId，已逐渐废弃，建议使用订阅消息）
      return {
        success: false,
        errMsg: "uniformMessage 已逐渐废弃，建议使用 subscribeMessage",
      };
    }

    // 记录通知日志
    await db.collection("notify_logs").add({
      data: {
        toUser: targetOpenid,
        reportId: reportId || "",
        notifyType,
        templateId: TEMPLATE_ID,
        result: sendResult,
        createdAt: db.serverDate(),
      },
    });

    return {
      success: true,
      msgid: sendResult.msgid || "",
    };
  } catch (err) {
    return { success: false, errMsg: err.message || err };
  }
};

/**
 * 截断文本（订阅消息字段有长度限制）
 */
function truncate(text, maxLen) {
  if (!text) return "";
  return text.length > maxLen ? text.substring(0, maxLen - 1) + "…" : text;
}

/**
 * 格式化时间
 */
function formatTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}
