Page({
  data: {
    orderId: '',
    amount: ''
  },

  onInputOrderId(e) {
    this.setData({ orderId: e.detail.value })
  },

  onInputAmount(e) {
    this.setData({ amount: e.detail.value })
  },

  async submitOrder() {
    const { orderId, amount } = this.data

    if (!orderId || !amount) {
      wx.showToast({ title: '请输入订单号和金额', icon: 'none' })
      return
    }

    wx.showLoading({ title: '正在生成支付参数...', mask: true })

    try {
      // 1. 调用独立的 V2 支付云函数 'pay'
      const res = await wx.cloud.callFunction({
        name: 'pay',
        data: {
          orderid: orderId,
          money: parseInt(amount) // 确保金额为整数分
        }
      })

      wx.hideLoading()

      if (res.result.code !== 0) {
        throw new Error(res.result.msg || '获取支付参数失败')
      }

      const payParams = res.result.data

      // 2. 调起微信支付 (严格使用 V2 返回的参数名)
      wx.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package, // V2 的 package 已经包含了 'prepay_id=' 前缀
        signType: payParams.signType,
        paySign: payParams.paySign,
        fail(err) {
          console.error('支付失败', err)
          if (err.errMsg && err.errMsg.includes('cancel')) {
            wx.showToast({ title: '用户取消支付', icon: 'none' })
          } else {
            wx.showToast({ title: '支付失败', icon: 'none' })
          }
        },
        success(res) {
          console.log('支付动作完成', res);
          wx.showLoading({ title: '确认支付状态...', mask: true });

          // 延迟 2 秒，给微信回调通知留出到达服务器并更新数据库的时间
          setTimeout(() => {
            wx.hideLoading();
            wx.showModal({
              title: '支付提交',
              content: '订单已提交，请稍后在订单历史中查看支付结果',
              showCancel: false,
              success: () => {
                wx.navigateTo({
                  url: '/pages/orderHistory/orderHistory'
                });
              }
            });
          }, 2000);
        }
      })
    } catch (err) {
      wx.hideLoading()
      console.error('Payment Error:', err)
      wx.showToast({ title: err.message || '系统错误', icon: 'none' })
    }
  }
})
