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

  submitOrder: function() {
    // ================== 强力视觉验证 ==================
    wx.showModal({
      title: '调试模式',
      content: '准备发起真实支付请求！如果你看到这个弹窗，说明新代码已生效。',
      showCancel: false,
      success: (res) => {
        console.log('[PaymentDebug] Modal confirmed, proceeding to payment');
        this.realSubmitOrder();
      }
    });
  },

  realSubmitOrder: function() {
    console.log('[PaymentDebug] Step 1: realSubmitOrder started');
    if (this.data.items.length === 0) {
      wx.showToast({ title: '订单中没有商品', icon: 'none' });
      return;
    }

    const user = wx.getStorageSync('userLoginInfo') || wx.getStorageSync('user') || {};
    const account = user.userAccount;

    console.log('[PaymentDebug] User Account:', account);
    if (!account) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在发起支付...', mask: true });

    const orderId = 'ORD' + Date.now();
    const total = parseFloat(this.data.totalPrice);
    console.log(`[PaymentDebug] Step 2: Calling cloud function. OrderId: ${orderId}, Amount: ${total}`);

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        action: 'createPayment',
        data: {
          orderId: orderId,
          amount: total,
          shopAccount: account
        }
      },
      success: (res) => {
        console.log('[PaymentDebug] Step 3: Cloud function success response:', res);
        if (res.result && res.result.success) {
          const p = res.result.params;
          console.log('[PaymentDebug] Step 4: Requesting wx.requestPayment with params:', p);

          wx.requestPayment({
            timeStamp: p.timestamp,
            nonceStr: p.noncestr,
            package: p.package,
            sign: p.sign,
            success: (payRes) => {
              console.log('[PaymentDebug] Step 5: wx.requestPayment SUCCESS', payRes);
              wx.showToast({ title: '支付成功', icon: 'success' });
              setTimeout(() => {
                wx.navigateTo({
                  url: `/pages/productDetail/productDetail?status=pay_success&amount=${total}&method=${this.data.payMethod}`
                });
              }, 1500);
            },
            fail: (err) => {
              console.error('[PaymentDebug] Step 5: wx.requestPayment FAIL', err);
              wx.showToast({ title: '支付取消或失败', icon: 'none' });
            }
          });
        } else {
          console.error('[PaymentDebug] Step 4: Cloud function returned success:false', res.result);
          wx.showToast({ title: res.result.message || '支付初始化失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('[PaymentDebug] Step 3: Cloud function call FAILED', err);
        wx.showToast({ title: '服务器错误', icon: 'none' });
      },
      complete: () => {
        console.log('[PaymentDebug] Step 6: callFunction complete');
        wx.hideLoading();
      }
    });
  }
})