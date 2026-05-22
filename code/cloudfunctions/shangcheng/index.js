// 云函数入口文件
const cloud = require('wx-server-sdk')
const mssql = require('mssql')
const crypto = require('crypto')
const axios = require('axios')
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
  v3ApiKey: 'YHLTDlyh079100012026051923939h23', // 32位
  merchantSerialNo: '7AC03D2606A7AFFEA257FA77D6A1617CDA7002D5', // 证书序列号
  merchantPrivateKey: `-----BEGIN PRIVATE KEY-----
  MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDkn5dIHApst0eS
  dJpsIXzb6XmjZh3YB8HD1+WznoHYHE4FhSy7zCREezCe8rJfJpypwJuEEYi1SZ5W
  3QqmQtNEx9pGziJDyRczEJ5NdJIPiog884xdQXJfmdzSlit2obCDondDVwPadN8q
  l8IqQfhh/ONzHPUP886POAFbJ4URNFFI1MTXxyopuuVCHowYNcla5SQd7HlnvudP
  nG7k6eSXmBPF+oZEMKr73q/0I3IrTbq8IBufMfO9ZX+nPPEPYBM/LsFMTf/LiAiX
  cMCwkI2F6Wo0r47N6JLjFi0CGRBpS93+mboEvuAKAAMrktcVrdyaW/ymEJ7QNtbv
  U9Zf7qMxAgMBAAECggEALj45k1RYp3TK/Uyoj4aWgsTO3cYh8zhecQaSZ6qACP5w
  qZ0uVy4Lh+6C/yOIAMcGmS9kRWpmhITHijpblRWfNiJWfEvlkmByWNnbqz8Q7CPR
  OsLoeVRrlfrBN7c4Q16hHX8XMH/BP8az/SGFHJcLboaAWyBYUUm3VjC11YJA4CGb
  ELIb3HsYbKyHvJ076cpfgY2HH9lig7iVKA8UqyjaIIu6RAcKOGjRS8OybqwjjJxF
  mpM0gdSi7kIABWBvbWIIi8FzAcPAsr3UE80f7G+6rdlkuP50cg/EPOiVqxe6+ITg
  XhNtC3wQu3oyTn41nIT7RR3SuVBf+yRackTcCsPqAQKBgQDzQe4NBpZPDpG69MCF
  9LMbV7omiBEzkmMN985jEBX0RLcscNNykKOqbE7sdhbY8RFgsmfq2w/Hu+8p+t45
  GmA2kjW8ApwEBXjqsyrXiYCdrtHyzTeX06v1GpRUAEOoVc49S0UUTFQku9GpJqJb
  mQK3objZFRj5Da+lBeHWbR8UyQKBgQDwmWsIfch57rmIrV4rFQVbvqEDMqkEEvFi
  Xl3Kb65LS4EP0LlrKCL8JXsYku8MAOvRBa/djM1C+EBy4pbcxOxH8EtkFh4VS2rp
  BcaIt4XVn2T5Sg2RAAa65IhJaMc69V3wXQxv+g5qg0VqEtWFUnDnSWrnyv+AdVnR
  14mEDMRXKQKBgCg7VDq1RzDGERYhmqHNCb5Q8QmkYWvtHxLVVD4QEAF5R+5CrsX4
  5AiwpxD2quqwXBZpC0TNfDulenWv9wbstNLxtY9lwxXrLcdrYH+LT0lE+5YzmKk0
  qfD8t2F5NbdmkZiTlVY5FYWJxrA6IooRsWBbj+3fTmUKfW1GnsZO/9/5AoGAAgP2
  /pI3LLZQPZHeORQrAFK/fIxfGBakiQNrW7fFyQGv6hcAhqJGcMBLoLASapJTZ2PZ
  zkxQp9/2gj/dranEpPGhYAxDYkBIe/09ZYXMDDcSnHf/Vxid9dDWR28mRBssF0hg
  Q0vf9Qp2eWYA/eXr5jQaPijYLRZOk1Bv6XhF6MkCgYAzITvwIpNKq5EF2EGko5dC
  YTAW9JrAWSqRyKgW8y1u6ySZCm9CYwzDPrQ8fpw4q+Ma8PCZnDSiy4P0OsNhCSpT
  rpKIkcvxjEQudx23T/cd40j5ZDiFyS1TPK9AqqnsrUQ9umDqCW7hDY0iXj3SyECQ
  rvozGyYqjpm3r57vQNa/IA==
  -----END PRIVATE KEY-----  
  `
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

  // 极致清理私钥：删除所有行首尾空格，并确保每行只有一个 \n
  const cleanPrivateKey = config.merchantPrivateKey
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  // 严格按照 V3 规范构建签名原串：数组 join('\n') 确保换行符数量绝对精准
  // 格式：HTTP方法 + \n + URL + \n + 时间戳 + \n + 随机串 + \n + Body + \n
  const signingComponents = [
    method.toUpperCase(),
    url,
    timestamp,
    nonceStr,
    body || ''
  ];
  const finalSigningString = signingComponents.join('\n') + '\n';

  // 【极致调试】打印结果，用 | 包裹以便观察不可见字符
  console.log('[PaymentDebug] Final Signing String (Visual):\n' + `|${finalSigningString}|`);

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(finalSigningString);
  const signature = signer.sign(cleanPrivateKey, 'base64');

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

      // 使用 V3 配置
      const payConfig = (V3_CONFIG.appid !== 'wxf3c03c2a0c59d299')
        ? V3_CONFIG
        : (configRes.recordsets[0] ? configRes.recordsets[0][0] : V3_CONFIG);

      if (!payConfig) throw new Error('商家未配置微信支付凭据');

      // 优先从云函数上下文获取，其次从 data 传参获取，最后使用手动指定的测试 openid
      const finalOpenid = context.OPENID || data.openid || 'oPTYg5dSDjYZ2mMdytcw_R8yq3PI';
      if (!finalOpenid) throw new Error('无法获取用户 OpenID');

      const payParams = {
        appid: payConfig.appid || payConfig.AppId,
        mchid: payConfig.mchid || payConfig.Mchid,
        description: `Order${orderId}`,
        out_trade_no: orderId,
        notify_url: 'https://service-xyz.cloudbase.cloud/paymentCallback',
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
      const authorizationHeader = `WECHATPAY2-SHA256-RSA2018 ${auth.timestamp} ${auth.nonceStr} ${auth.signature}`;

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
        // V3 签名规则：appid\n时间戳\n随机串\nprepay_id
        const payTimestamp = Math.floor(Date.now() / 1000).toString();
        const payNonceStr = crypto.randomBytes(16).toString('hex');
        const paySigningString = `${V3_CONFIG.appid}\n${payTimestamp}\n${payNonceStr}\n${prepayId}`;

        const paySigner = crypto.createSign('RSA-SHA256');
        paySigner.update(paySigningString);
        const paySign = paySigner.sign(V3_CONFIG.merchantPrivateKey, 'base64');

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
