Page({
  data: {
    qrUrl: '',
    dianpuName: ''
  },

  onLoad: function() {
    const user = wx.getStorageSync('userLoginInfo') || {};
    const dianpu = user.dianpu;

    if (!dianpu) {
      wx.showToast({ title: '未找到店铺信息', icon: 'none' });
      return;
    }

    this.setData({
      dianpuName: dianpu
    });

    // 构造店铺专属跳转链接
    // 在小程序中，可以通过携带参数的页面路径实现
    const storePath = `/pages/merchant-store/merchant-store?store=${encodeURIComponent(dianpu)}`;
    this.setData({
      qrUrl: storePath
    });
  },

  copyQrUrl: function() {
    wx.setClipboardData({
      data: this.data.qrUrl,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      }
    });
  },

  saveQrCode: function() {
    wx.showToast({
      title: '请长按图片保存',
      icon: 'none'
    });
  }
})