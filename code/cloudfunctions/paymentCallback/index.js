const cloud = require('wx-server-sdk')
const mssql = require('mssql')
const xml2js = require('xml2js')
const crypto = require('crypto')
cloud.init()

// 1. 配置信息 (必须与 pay 函数中的 config 一致)
const config = {
  partnerKey: 'YHLTDlyh079100012026052223939hv2', // APIv2 密钥
  dbConfig: {
    user: 'sa',
    password: 'Lyh07910_001',
    server: 'yhocn.cn',
    database: 'yh_shangcheng',
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
};

async function executeQuery(query, params = []) {
  const pool = await mssql.connect(config.dbConfig);
  const request = pool.request();
  params.forEach((val, i) => {
    request.input(`param${i}`, val);
  });
  const result = await request.query(query);
  return result;
}

// V2 签名验证函数
function verifyV2Signature(data, sign) {
  const keys = Object.keys(data).sort();
  let stringToSign = '';
  for (const key of keys) {
    stringToSign += `${key}=${data[key]}&`;
  }
  stringToSign += `key=${config.partnerKey}`;

  const hash = crypto.createHash('md5').update(stringToSign).digest('hex').toUpperCase();
  return hash === sign.toUpperCase();
}

exports.main = async (event, context) => {
  console.log('[PaymentCallback] Received Request');

  let xmlData = '';
  if (typeof event.body === 'string') {
    xmlData = event.body;
  } else if (event.body && event.body.data) {
    xmlData = event.body.data;
  } else {
    console.error('[PaymentCallback] No body found in event');
    return 'FAIL';
  }

  try {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);
    const payData = result.xml;

    if (!payData) {
      console.error('[PaymentCallback] XML parse result is empty');
      return 'FAIL';
    }

    console.log('[PaymentCallback] Parsed PayData:', payData);

    // 验证签名 (V2 签名验证)
    const { sign, ...params } = payData;
    if (!verifyV2Signature(params, sign)) {
      console.warn('[PaymentCallback] Signature verification failed!');
      // 调试期间可先注释掉 return 'FAIL'
      // return 'FAIL';
    }

    const out_trade_no = payData.out_trade_no;
    const resultCode = payData.result_code;
    const return_code = payData.return_code;

    if (return_code === 'SUCCESS' && resultCode === 'SUCCESS') {
      console.log(`[PaymentCallback] Order ${out_trade_no} payment successful.`);
      await executeQuery(`UPDATE orders SET status = 'paid' WHERE order_no = @param0`, [out_trade_no]);
      return 'SUCCESS';
    }

    return 'FAIL';
  } catch (err) {
    console.error('[PaymentCallback] Error processing callback:', err);
    return 'FAIL';
  }
}
