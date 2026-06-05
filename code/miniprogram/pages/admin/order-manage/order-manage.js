Page({
  data: {
    orders: []
  },

  onShow: function() {
    this.fetchOrders();
  },

  fetchOrders: function() {
    const user = wx.getStorageSync('user') || {};
    const storeName = user.dianpu;

    if (!storeName) {
      wx.showToast({ title: '未获取到店铺信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加载订单...' });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT id, ddh, cpmc, khmc, xshj, ddzt FROM dingdan WHERE sjmc = '${storeName}' ORDER BY id DESC`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data) {
          this.setData({ orders: data });
        } else {
          this.setData({ orders: [] });
        }
      },
      fail: (err) => {
        console.error('Fetch orders failed', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  handleReturn: function(e) {
    const { id, status } = e.currentTarget.dataset;
    if (status !== '申请退货') {
      wx.showToast({ title: '仅可审核申请退货订单', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认审核',
      content: '确定同意该退货申请吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          wx.cloud.callFunction({
            name: 'shangcheng',
            data: { query: `UPDATE dingdan SET ddzt = '退货' WHERE id = ${id}` },
            success: () => {
              wx.showToast({ title: '审核通过' });
              this.fetchOrders();
            },
            complete: () => wx.hideLoading()
          });
        }
      }
    });
  },

  handleRejectReturn: function(e) {
    const { id, status } = e.currentTarget.dataset;
    if (status !== '申请退货') {
      wx.showToast({ title: '仅可审核申请退货订单', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认拒绝',
      content: '确定拒绝该申请并恢复为【下单】状态吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          wx.cloud.callFunction({
            name: 'shangcheng',
            data: { query: `UPDATE dingdan SET ddzt = '下单' WHERE id = ${id}` },
            success: () => {
              wx.showToast({ title: '已拒绝' });
              this.fetchOrders();
            },
            complete: () => wx.hideLoading()
          });
        }
      }
    });
  }
})