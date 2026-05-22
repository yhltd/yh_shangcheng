Page({
  data: {
    dianpuName: '',
    products: []
  },

  onLoad: function() {
    this.loadStoreData();
  },

  loadStoreData: function() {
    const user = wx.getStorageSync('userLoginInfo') || {};
    const dianpu = user.dianpu;

    if (!dianpu) {
      wx.showToast({
        title: '未找到店铺信息',
        icon: 'none'
      });
      return;
    }

    this.setData({
      dianpuName: dianpu
    });

    this.fetchStoreProducts(dianpu);
  },

  fetchStoreProducts: function(dianpu) {
    wx.showLoading({ title: '加载中...' });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT * FROM shangpin WHERE dianpu = '${dianpu}'`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0) {
          const products = data.map(item => {
            const originalPrice = parseFloat(item.yuanjia) || 0;
            const zhekou = parseFloat(item.zhekou);
            const currentPrice = (!isNaN(zhekou) && zhekou !== 1)
              ? (originalPrice * zhekou).toFixed(2)
              : originalPrice.toFixed(2);

            return {
              id: item.id,
              name: item.mingcheng,
              price: currentPrice,
              img: item.ztu,
              shuliang: parseInt(item.shuliang) || 0
            };
          });
          this.setData({ products });
        } else {
          this.setData({ products: [] });
        }
      },
      fail: (err) => {
        console.error('Fetch store products failed', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/productDetail/productDetail?id=${id}`
    });
  },

  goToQrCode: function() {
    console.log('goToQrCode triggered');
    wx.navigateTo({
      url: '/pages/merchant-store/qr-code',
      fail: (err) => {
        console.error('Navigate to QR code failed:', err);
        wx.showToast({
          title: '跳转失败，请重新编译',
          icon: 'none'
        });
      }
    });
  }
})