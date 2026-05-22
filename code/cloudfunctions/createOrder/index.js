const cloud = require('wx-server-sdk')
const mssql = require('mssql')
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
  }
};

async function executeQuery(query, params = []) {
  const pool = await mssql.connect(dbConfig);
  const request = pool.request();
  params.forEach((val, i) => {
    request.input(`param${i}`, val);
  });
  const result = await request.query(query);
  return result;
}

exports.main = async (event, context) => {
  try {
    const { userAccount, items, totalPrice, address, remark } = event;

    if (!userAccount || !items || !totalPrice) {
      throw new Error('Missing required order information');
    }

    const orderId = 'ORD' + Date.now();
    const orderDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 将订单基础信息存入 orders 表
    // 假设 orders 表包含: order_no, user_account, total_amount, address, remark, status, created_at
    const query = `
      INSERT INTO orders (order_no, user_account, total_amount, address, remark, status, created_at)
      VALUES (@param0, @param1, @param2, @param3, @param4, 'pending', @param5)
    `;

    const addressStr = JSON.stringify(address);
    await executeQuery(query, [orderId, userAccount, totalPrice, addressStr, remark, orderDate]);

    // 将订单详情存入 order_items 表 (假设存在该表)
    // 假设 order_items 包含: order_no, product_id, quantity, price
    for (const item of items) {
      const itemQuery = `INSERT INTO order_items (order_no, product_id, quantity, price) VALUES (@param0, @param1, @param2, @param3)`;
      await executeQuery(itemQuery, [orderId, item.id, item.quantity, item.price]);
    }

    return {
      success: true,
      orderId: orderId
    };
  } catch (err) {
    console.error('createOrder Error:', err);
    return {
      success: false,
      message: err.message || '订单创建失败'
    };
  }
}
