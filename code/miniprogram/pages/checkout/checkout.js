Page({
  data: {
    items: [],
    totalPrice: '0.00',
    address: {
      name: '',
      phone: '',
      detail: ''
    },
    remark: '',
    payMethod: 'wechat' // 默认微信支付
  },

  onLoad: function(options) {
    if (options.items) {
      try {
        this.setData({
          items: JSON.parse(decodeURIComponent(options.items)),
          totalPrice: options.total || '0.00'
        });
      } catch (e) {
        console.error('Parse items failed', e);
      }
    }
    this.loadAddress();
  },

  loadAddress: function() {
    const user = wx.getStorageSync('userLoginInfo') || {};
    const zhanghao = user.userAccount;

    if (!zhanghao) {
      this.setData({
        address: {
          name: '未登录',
          phone: '',
          detail: '请先登录后设置地址'
        }
      });
      return;
    }

    wx.showLoading({ title: '加载地址中...', mask: true });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT yonghuming, zhanghao, shdz FROM login WHERE zhanghao = '${zhanghao}'`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0) {
          const userRecord = data[0];
          this.setData({
            address: {
              name: userRecord.yonghuming || '未设置',
              phone: userRecord.zhanghao || '未设置',
              detail: userRecord.shdz || '您尚未设置收货地址'
            }
          });
        } else {
          this.setData({
            address: {
              name: '未知用户',
              phone: '',
              detail: '未找到地址信息'
            }
          });
        }
      },
      fail: (err) => {
        console.error('Fetch address failed', err);
        wx.showToast({ title: '获取地址失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  chooseAddress: function() {
    wx.showToast({
      title: '请在个人中心设置地址',
      icon: 'none'
    });
  },

  selectPayMethod: function(e) {
    const method = e.currentTarget.dataset.method;
    this.setData({
      payMethod: method
    });
  },

  onRemarkInput: function(e) {
    this.setData({
      remark: e.detail.value
    });
  },

  submitOrder: async function() {
    if (this.data.items.length === 0) {
      wx.showToast({ title: '订单中没有商品', icon: 'none' });
      return;
    }

    const user = wx.getStorageSync('userLoginInfo') || wx.getStorageSync('user') || {};
    const account = user.userAccount;
    const userName = user.userName || '未知用户';

    // 从地址数据中获取店铺名（如果可用），或者从缓存获取
    const storeName = user.dianpu || '默认店铺';

    if (!account) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在处理订单...', mask: true });

    try {
      const orderId = 'ORD' + Date.now();
      const total = parseFloat(this.data.totalPrice);
      const amountInFen = Math.round(total * 100); // 转换为分

      // 1. 先将订单详情写入数据库 (dingdan 表)
      // 构建多行插入 SQL 语句
      let sqlValues = this.data.items.map(item => {
        return `('${orderId}', '${item.pname}', ${item.num}, ${item.price}, ${item.subtotal}, '${userName}', '${storeName}', '下单', '可见')`;
      }).join(',');

      const insertQuery = `INSERT INTO dingdan (ddh, cpmc, xssl, xsdj, xshj, khmc, sjmc, ddzt, visibility) VALUES ${sqlValues}`;

      await wx.cloud.callFunction({
        name: 'shangcheng',
        data: { query: insertQuery }
      });

      // 2. 调用 pay 云函数获取支付参数
      console.log('Calling pay function with:', { orderid: orderId, money: amountInFen });

      const payData = {
        orderid: String(orderId),
        money: Number(amountInFen)
      };

      const res = await wx.cloud.callFunction({
        name: 'pay',
        data: payData
      });

      wx.hideLoading();

      if (res.result.code !== 0) {
        throw new Error(res.result.msg || '获取支付参数失败');
      }

      const payParams = res.result.data;

      // 3. 调起微信支付
      wx.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign,
        success: (payRes) => {
          wx.showToast({ title: '支付成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/orderHistory/orderHistory'
            });
          }, 1500);
        },
        fail: (err) => {
          console.error('Payment Failed:', err);
          if (err.errMsg && err.errMsg.includes('cancel')) {
            wx.showToast({ title: '用户取消支付', icon: 'none' });
          } else {
            wx.showToast({ title: '支付失败', icon: 'none' });
          }
        }
      });
    } catch (err) {
      wx.hideLoading();
      console.error('Order Submission Error:', err);
      wx.showToast({ title: err.message || '系统错误', icon: 'none' });
    }
  },

  // 移除不再需要的 realSubmitOrder 方法

})