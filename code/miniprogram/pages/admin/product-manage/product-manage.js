Page({
  data: {
    products: []
  },

  onShow: function() {
    this.fetchProducts();
  },

  onLoad: function() {
    this.fetchProducts();
  },

  fetchProducts: function() {
    wx.showLoading({ title: '加载中...', mask: true });

    // 1. 获取并检查登录缓存中的 dianpu 字段
    let user = wx.getStorageSync('user') || {};
    let dianpu = user.dianpu;

    if (!dianpu) {
      console.log('Cache dianpu missing, assigning default value...');
      dianpu = 'DefaultShop'; // 默认店铺值
      user.dianpu = dianpu;
      wx.setStorageSync('user', user);
    }

    const self = this;
    const attemptFetch = (retryCount = 0) => {
      wx.cloud.callFunction({
        name: 'shangcheng',
        data: {
          // 2. 在查询中加入 dianpu 限制条件
          query: `SELECT id, mingcheng, yuanjia, zhekou, shuliang FROM shangpin WHERE dianpu = '${dianpu}'`
        },
        success: (res) => {
          const data = res.result && res.result.recordsets && res.result.recordsets[0];
          if (data) {
            const productsWithPrice = data.map(item => {
              const price = parseFloat(item.yuanjia) || 0;
              const discount = parseFloat(item.zhekou) || 1;
              return {
                ...item,
                finalPrice: (price * discount).toFixed(2)
              };
            });
            self.setData({ products: productsWithPrice });
          } else {
            self.setData({ products: [] });
          }
          wx.hideLoading();
        },
        fail: (err) => {
          console.error(`Fetch attempt ${retryCount + 1} failed:`, err);
          if (retryCount < 2) {
            setTimeout(() => attemptFetch(retryCount + 1), 500 * (retryCount + 1));
          } else {
            wx.hideLoading();
            wx.showModal({
              title: '加载失败',
              content: '网络连接不稳定，请点击确定重试',
              showCancel: false,
              success: (res) => {
                self.fetchProducts();
              }
            });
          }
        }
      });
    };

    attemptFetch();
  },

  handleAddProduct: function() {
    wx.navigateTo({
      url: '/pages/admin/product-add/product-add'
    });
  },

  handleEdit: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/admin/product-edit/product-edit?id=' + id
    });
  },

  handleDelete: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          wx.cloud.callFunction({
            name: 'shangcheng',
            data: {
              query: `DELETE FROM shangpin WHERE id = ${id}`
            },
            success: () => {
              wx.showToast({ title: '已删除', icon: 'success' });
              this.fetchProducts();
            },
            fail: (err) => {
              console.error('Delete failed', err);
              wx.showToast({ title: '删除失败', icon: 'none' });
            },
            complete: () => {
              wx.hideLoading();
            }
          });
        }
      }
    });
  }
})
