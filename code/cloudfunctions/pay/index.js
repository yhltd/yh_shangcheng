// 云函数入口文件
const cloud = require('wx-server-sdk')
const tenpay = require('tenpay');

cloud.init()

// 2. 配置支付信息 (V2 版本)
// 注意：此处的 partnerKey 是 APIv2 密钥，与 APIv3 密钥不同
const config = {
  appid: 'wxf3c03c2a0c59d299', // 小程序AppID
  mchid: '1744184735',        // 微信支付商户号
  partnerKey: 'YHLTDlyh079100012026052223939hv2', // 微信支付安全密钥(APIv2 Key，32位)
  notify_url: 'https://yhocn.cn/paymentCallback', // 支付回调地址
  spbill_create_ip: '127.0.0.1'
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // 获取前端传来的订单号和金额
  let { orderid, money } = event;

  // 简单校验
  if (!orderid || !money) {
    return { code: -1, msg: '参数缺失' }
  }

  try {
    // 3. 初始化支付
    const api = tenpay.init(config);

    // 4. 获取支付参数
    let result = await api.getPayParams({
      out_trade_no: orderid, // 商户订单号
      body: '商品简单描述',   // 商品描述
      total_fee: money,      // 订单金额(单位：分)
      openid: wxContext.OPENID // 付款用户的openid
    });

    // 返回给前端的参数 (tenpay 返回的 result 已包含 timeStamp, nonceStr, package, signType, paySign)
    return {
      code: 0,
      data: result
    };
  } catch (err) {
    console.error('V2 Payment Error:', err);
    return {
      code: -1,
      msg: '支付参数生成失败',
      error: err.message
    };
  }
}
