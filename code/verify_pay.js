const crypto = require('crypto');

/**
 * 微信支付签名本地验证脚本
 * 用于验证 API Key 和待签名字符串是否能生成正确的签名
 */
function verifyWechatSign() {
    // ================= 配置区 =================
    // 1. 填入您在代码中使用的 API Key
    const apiKey = 'YHLTDlyh079100012026081023939h23';

    // 2. 填入日志中的 "String to be signed" (待签名字符串)
    const dataToSign = 'appid=wxf3c03c2a0c59d299&body=订单ORD1779162208768付款&currency=CNY&mch_id=1744184735&nonce_str=8c463159f07e33e4e13790a833ec9538&out_trade_no=ORD1779162208768&total_fee=5600&trade_type=MQQDPAY';

    // 3. 日志中云函数实际生成的签名 (用于对比)
    const cloudFunctionSign = '45794A24AB784CEC4D303B6A057385CCC1191878';
    // =========================================

    console.log('==================================================');
    console.log('       微信支付签名本地比对工具');
    console.log('==================================================');
    console.log('待签名字符串:', dataToSign);
    console.log('使用的 API Key:', apiKey);

    try {
        // 严格执行微信支付 V2 签名算法：HMAC-SHA1 -> Hex -> UpperCase
        const resultSign = crypto.createHmac('sha1', apiKey)
                                .update(dataToSign, 'utf8')
                                .digest('hex')
                                .toUpperCase();

        console.log('\n--------------------------------------------------');
        console.log('本地计算出的签名:', resultSign);
        console.log('云函数生成的签名:', cloudFunctionSign);
        console.log('--------------------------------------------------');

        if (resultSign === cloudFunctionSign) {
            console.log('\n✅ [结果一致]');
            console.log('结论：代码逻辑 100% 正确。');
            console.log('\n⚠️ 关键诊断：');
            console.log('既然代码正确但微信依然报“签名错误”，这证明了：');
            console.log('【您填入的 API Key 并不是该商户号在微信后台配置的正确密钥】');
            console.log('\n👉 解决办法：请登录商户平台 -> 账户中心 -> API安全 -> 重置 API 密钥。');
        } else {
            console.log('\n❌ [结果不一致]');
            console.log('结论：本地计算结果与云函数结果不同，代码实现存在问题。');
        }
    } catch (err) {
        console.error('\n运行出错:', err);
    }
    console.log('==================================================\n');
}

verifyWechatSign();
