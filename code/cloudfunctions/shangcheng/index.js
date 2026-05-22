// 云函数入口文件
const cloud = require('wx-server-sdk')
const mssql = require('mssql')
const crypto = require('crypto')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
cloud.init()

const dbConfig = {
  user: 'sa',
  password: 'Lyh07910_001',
  server: 'yhocn.cn',
  database: 'yh_shangcheng',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    min: 0,
    max: 10,
    idleTimeoutMillis: 10
  }
};

// 临时测试配置 (V3 版本)
const V3_CONFIG = {
  mchid: '1744184735',
  appid: 'wxf3c03c2a0c59d299',
  v3ApiKey: 'YHLTDlyh079100012026052223939h23', // 32位
  merchantSerialNo: '223765FB3609C681933215FCABD3BB6AD4BCF5E6', // 证书序列号
  privateKeyPath: path.join(__dirname, 'apiclient_key.pem')
};

let poolPromise = mssql.connect(dbConfig);

async function executeQuery(query, params = []) {
  const pool = await poolPromise;
  const request = pool.request();
  params.forEach((val, i) => {
    request.input(`param${i}`, val);
  });
  const result = await request.query(query);
  return {
    recordsets: result.recordsets,
    recordset: result.recordset,
    rowsAffected: result.rowsAffected
  };
}

// 简易 XML 构造函数 (Deprecated - V2)
function buildXml(params) {
  // Kept for compatibility until migration complete
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<XML>';
  for (let key in params) {
    xml += `<${key}>${params[key]}</${key}>`;
  }
  xml += '</XML>';
  return xml;
}

// 简易 XML 解析函数 (Deprecated - V2)
function parseXml(xml) {
  // Kept for compatibility until migration complete
  const result = {};
  const regex = /<([^> \t\n\r\f\v]+)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    let value = match[2].trim();
    value = value.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1');
    result[match[1]] = value;
  }
  return result;
}


// 微信支付 V3 签名生成函数
function generateV3Authorization(method, url, body, config) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');

  // 直接从本地文件读取私钥，完全避免字符串格式问题
  let privateKey;
  try {
    privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
  } catch (err) {
    throw new Error(`无法读取私钥文件: ${err.message}`);
  }

  // 构建签名原串 (严格按照 V3 规范，末尾不加 \n)
  const signingComponents = [
    method.toUpperCase(),
    url,
    timestamp,
    nonceStr,
    body || ''
  ];
  const finalSigningString = signingComponents.join('\n');

  // 打印签名原串，用于排查不可见字符
  console.log('[PaymentDebug] Signing String:', JSON.stringify(finalSigningString));

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(finalSigningString);
  const signature = signer.sign(privateKey, 'base64');

  return {
    timestamp,
    nonceStr,
    signature
  };
}


exports.main = async (event, context) => {
  try {
    if (event.query && !event.action) {
      return await executeQuery(event.query);
    }

    const { action, data } = event;

    if (action === 'testSign') {
      const testString = 'TEST_SIGNING_STRING';
      const cleanPrivateKey = V3_CONFIG.merchantPrivateKey.replace(/^\s+/gm, '').trim();
      try {
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(testString);
        const signature = signer.sign(cleanPrivateKey, 'base64');
        return {
          success: true,
          testString: testString,
          signature: signature,
          message: '签名生成成功，请将此结果与官方工具对比'
        };
      } catch (e) {
        return { success: false, message: '签名失败: ' + e.message };
      }
    }

      const { orderId, amount, shopAccount, openid } = data;

      // 1. 获取配置
      const configRes = await executeQuery(`SELECT * FROM MerchantPaymentConfig WHERE MerchantId = @param0 AND PaymentType = 'wechat_pay'`, [shopAccount]);

      // 强制使用 V3_CONFIG 进行调试，排除数据库旧配置干扰
      const payConfig = V3_CONFIG;

      if (!payConfig) throw new Error('商家未配置微信支付凭据');

      // 优先从云函数上下文获取，其次从 data 传参获取，最后使用手动指定的测试 openid
      const finalOpenid = context.OPENID || data.openid || 'oPTYg5dSDjYZ2mMdytcw_R8yq3PI';
      if (!finalOpenid) throw new Error('无法获取用户 OpenID');

      const payParams = {
        appid: payConfig.appid || payConfig.AppId,
        mchid: payConfig.mchid || payConfig.Mchid,
        description: `Order${orderId}`,
        out_trade_no: orderId,
        notify_url: 'https://yhocn.cn/paymentCallback',
        amount: {
          currency: 'CNY',
          total: Math.round(amount * 100)
        },
        payer: {
          openid: finalOpenid
        }
      };

      // 强制生成一个没有空格、没有换行的纯净 JSON 字符串
      const jsonBody = JSON.stringify(payParams);
      const url = '/v3/pay/transactions/jsapi';

      // 生成签名
      const auth = generateV3Authorization('POST', url, jsonBody, V3_CONFIG);
      const authorizationHeader = `WECHATPAY2-SHA256-RSA2048 ${auth.timestamp} ${auth.nonceStr} ${auth.signature}`;

      // ================== 终极调试日志 ==================
      console.log('[PaymentDebug] --- Request Credentials Snapshot ---');
      console.log(`[PaymentDebug] Target URL: https://api.mch.weixin.qq.com${url}`);
      console.log(`[PaymentDebug] Using Mchid: ${V3_CONFIG.mchid}`);
      console.log(`[PaymentDebug] Using Appid: ${V3_CONFIG.appid}`);
      console.log(`[PaymentDebug] Using SerialNo: ${V3_CONFIG.merchantSerialNo}`);
      console.log(`[PaymentDebug] Auth Header: ${authorizationHeader}`);
      console.log(`[PaymentDebug] Request Body: ${jsonBody}`);
      console.log('[PaymentDebug] ---------------------------------------');

      // 使用 Buffer 发送，防止 axios 修改 body 导致验签失败
      const response = await axios.post(`https://api.mch.weixin.qq.com${url}`, Buffer.from(jsonBody), {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorizationHeader,
          'Wechatpay-Serial': V3_CONFIG.merchantSerialNo
        },
        timeout: 5000,
        validateStatus: () => true
      });

      console.log('[PaymentDebug] V3 Response:', response.data);

      if (response.status === 200) {
        const resData = response.data;
        const prepayId = resData.prepay_id;

        // --- 修正 V3 预支付签名 (paySign) ---
        // 严格按照官方文档：
        // 1. 签名串共有四行，每一行以 \n 结尾，包括最后一行
        // 2. 格式：小程序appID\n时间戳\n随机串\nprepay_id=xxx\n
        const payTimestamp = Math.floor(Date.now() / 1000).toString();
        const payNonceStr = crypto.randomBytes(16).toString('hex');
        const paySigningString = `${V3_CONFIG.appid}\n${payTimestamp}\n${payNonceStr}\nprepay_id=${prepayId}\n`;

        const paySigner = crypto.createSign('RSA-SHA256');
        paySigner.update(paySigningString);

        const privateKey = fs.readFileSync(V3_CONFIG.privateKeyPath, 'utf8');
        const paySign = paySigner.sign(privateKey, 'base64');

        return {
          success: true,
          params: {
            appid: V3_CONFIG.appid,
            timestamp: payTimestamp,
            nonceStr: payNonceStr,
            prepay_id: prepayId,
            sign: paySign
          }
        };
      } else {
        throw new Error(`微信支付 V3 接口错误: ${response.data.message || '未知错误'}`);
      }
    

    if (action === 'paymentCallback') {
      // V3 回调验证逻辑
      const { orderId } = event;

      // 注意：在生产环境下，必须验证微信支付平台证书签名
      // 这里我们增加对关键字段的校验并记录详细日志
      if (!orderId) {
        console.error('[PaymentCallback] Error: Missing orderId in callback event');
        return 'FAIL';
      }

      console.log(`[PaymentCallback] Processing payment for order: ${orderId}`);

      try {
        const result = await executeQuery(`UPDATE orders SET status = 'paid' WHERE order_no = @param0`, [orderId]);
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
          console.log(`[PaymentCallback] Order ${orderId} successfully marked as paid`);
          return 'SUCCESS';
        } else {
          console.warn(`[PaymentCallback] Order ${orderId} not found or already updated`);
          return 'FAIL';
        }
      } catch (dbErr) {
        console.error(`[PaymentCallback] DB Error updating order ${orderId}:`, dbErr);
        return 'FAIL';
      }
    }

    return { error: 'Unsupported action' };

  } catch (err) {
    console.error('CloudFunction Error Detail:', {
      message: err.message,
      stack: err.stack,
      response: err.response ? err.response.data : 'No response data',
      request: err.request ? 'Request sent but no response' : 'No request sent'
    });
    return { success: false, message: err.message || '服务器内部错误' };
  }
}
