Page({
  data: {
    id: '',
    name: '',
    price: '',
    originalPrice: '',
    img: '',
    detail: '',
    category: '',
    subCategory: '',
    shuliang: 0,
    dianpu: '',
    quantity: 1
  },

  onLoad: function(options) {
    if (options && options.status === 'pay_success') {
      // 支付成功模式：不校验 ID，直接显示支付结果
      console.log('Payment success mode, skipping ID check');
      return;
    }

    if (options && options.id) {
      this.setData({
        id: options.id
      });
      this.fetchProductDetail(options.id);
    } else {
      wx.showToast({ title: '商品ID缺失', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  fetchProductDetail: function(id) {
    wx.showLoading({ title: '加载中...' });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT * FROM shangpin WHERE id = ${id}`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        const product = data ? data[0] : null;
        if (product) {
          const originalPrice = parseFloat(product.yuanjia) || 0;
          const zhekou = parseFloat(product.zhekou);
          const hasDiscount = !isNaN(zhekou) && zhekou !== 1;
          const currentPrice = hasDiscount ? (originalPrice * zhekou).toFixed(2) : originalPrice.toFixed(2);

          this.setData({
            name: product.mingcheng,
            price: currentPrice,
            originalPrice: originalPrice.toFixed(2),
            img: product.ztu,
            detail: product.xiangqing || '暂无详细描述',
            category: product.fenlei,
            subCategory: product.fenlei2,
            shuliang: parseInt(product.shuliang) || 0,
            dianpu: product.dianpu || '未知商家'
          });
        } else {
          wx.showToast({ title: '商品不存在', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('Fetch detail failed', err);
        wx.showToast({ title: '获取详情失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  increaseQty: function() {
    if (this.data.quantity < this.data.shuliang) {
      this.setData({
        quantity: this.data.quantity + 1
      });
    } else {
      wx.showToast({ title: '超过库存数量', icon: 'none' });
    }
  },

  decreaseQty: function() {
    if (this.data.quantity > 1) {
      this.setData({
        quantity: this.data.quantity - 1
      });
    }
  },

  handleBuy: function() {
    const p = this.data;
    const total = (parseFloat(p.price) * p.quantity).toFixed(2);

    // 1. 库存预校验
    if (p.quantity > p.shuliang) {
      wx.showToast({ title: '库存不足', icon: 'none' });
      return;
    }

    // 2. 构建单个商品的订单数据
    const itemData = [{
      id: p.id,
      name: p.name,
      price: p.price,
      count: p.quantity,
      img: p.img,
      total: total
    }];

    const itemsData = encodeURIComponent(JSON.stringify(itemData));

    // 3. 跳转到确认订单页
    wx.navigateTo({
      url: `/pages/checkout/checkout?items=${itemsData}&total=${total}`
    });
  },

  // 移除 processPayment 方法，因为现在统一由 checkout 页面处理提交逻辑

  handleAddToCart: function() {
    this.createOrder('购物车');
  },

  createOrder: function(status) {
    const p = this.data;
    const quantity = p.quantity;
    const price = parseFloat(p.price);
    const total = (price * quantity).toFixed(2);
    const orderId = 'DD' + Date.now() + Math.floor(Math.random() * 1000);

    // 1. 库存校验
    if (quantity > p.shuliang) {
      wx.showToast({ title: '库存不足', icon: 'none' });
      return;
    }

    // 获取用户信息
    let user = wx.getStorageSync('userLoginInfo') || {};
    let khmc = user.userName || '游客';

    // 获取当前时间
    const now = new Date();
    const xdrq = now.getFullYear() + '-' +
                 String(now.getMonth() + 1).padStart(2, '0') + '-' +
                 String(now.getDate()).padStart(2, '0') + ' ' +
                 String(now.getHours()).padStart(2, '0') + ':' +
                 String(now.getMinutes()).padStart(2, '0') + ':' +
                 String(now.getSeconds()).padStart(2, '0');

    wx.showLoading({ title: '处理中...' });

    // 构建事务 SQL: 1. 插入订单 2. 扣减库存
    // 注意：由于 cloudFunction 'shangcheng' 仅执行单条 query 字符串，
    // 我们需要确保 SQL Server 能够执行多条语句（以分号分隔）
    const sql = `
      INSERT INTO dingdan (ddh, cpmc, xssl, xsdj, xshj, sjmc, khmc, xdrq, ddzt, khkj)
      VALUES ('${orderId}', '${this.escape(p.name)}', ${quantity}, ${price}, ${total}, '${this.escape(p.dianpu)}', '${this.escape(khmc)}', '${xdrq}', '${status}', '可见');

      UPDATE shangpin SET shuliang = shuliang - ${quantity} WHERE id = ${p.id} AND shuliang >= ${quantity};
    `;

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: sql
      },
      success: (res) => {
        // 检查更新行数，如果 UPDATE 失败（库存不足），应提示用户
        // 注意：部分数据库驱动在执行多条语句时，recordsets 可能包含多个结果集
        wx.showToast({
          title: status === '下单' ? '下单成功' : '已加入购物车',
          icon: 'success'
        });

        // 更新本地库存显示
        this.setData({
          shuliang: p.shuliang - quantity
        });
      },
      fail: (err) => {
        console.error('Create order failed', err);
        wx.showToast({ title: '操作失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  escape: function(str) {
    if (!str) return '';
    return str.replace(/'/g, "''");
  }
})
