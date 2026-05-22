Page({
  data: {
    orders: []
  },

  onLoad: function() {
    this.fetchOrders();
  },

  fetchOrders: function() {
    const user = wx.getStorageSync('userLoginInfo') || {};
    const khmc = user.userName;

    if (!khmc) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    wx.showLoading({ title: '加载订单...' });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT ddh, cpmc, xssl, xsdj, xshj, xdrq, ddzt FROM dingdan WHERE khmc = '${this.escape(khmc)}' AND ddzt IN ('下单', '退单') ORDER BY xdrq DESC`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0) {
          this.setData({
            orders: data
          });
        } else {
          this.setData({
            orders: []
          });
        }
      },
      fail: (err) => {
        console.error('Fetch orders failed', err);
        wx.showToast({ title: '获取订单失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  escape: function(str) {
    if (!str) return '';
    return str.replace(/'/g, "''");
  },

  goHome: function() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
})
