Page({
  data: {
    cartItems: [],
    totalPrice: 0,
    selectAll: true
  },

  onShow: function() {
    this.fetchCartData();
  },

  onLoad: function() {
    this.fetchCartData();
  },

  fetchCartData: function() {
    const user = wx.getStorageSync('userLoginInfo') || {};
    const khmc = user.userName;

    if (!khmc) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    wx.showLoading({ title: '加载购物车...' });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT ddh, cpmc, xssl, xsdj, xshj FROM dingdan WHERE khmc = '${this.escape(khmc)}' AND ddzt = '购物车'`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0) {
          const items = data.map(item => ({
            id: item.ddh,
            name: item.cpmc,
            price: item.xsdj,
            count: item.xssl,
            total: item.xshj,
            selected: true
          }));

          // Calculate total immediately before setData to avoid async lag
          const total = items.reduce((sum, item) => {
            const val = parseFloat(item.total);
            return sum + (isNaN(val) ? 0 : val);
          }, 0);

          this.setData({
            cartItems: items,
            selectAll: true,
            totalPrice: total.toFixed(2)
          });
        } else {
          this.setData({
            cartItems: [],
            totalPrice: '0.00',
            selectAll: false
          });
        }
      },
      fail: (err) => {
        console.error('Fetch cart failed', err);
        wx.showToast({ title: '加载购物车失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  updateTotalPrice: function(items) {
    const targetItems = items || this.data.cartItems || [];
    const total = targetItems.reduce((sum, item) => {
      if (item.selected) {
        const val = parseFloat(item.total || 0);
        return sum + (isNaN(val) ? 0 : val);
      }
      return sum;
    }, 0);

    this.setData({
      totalPrice: total.toFixed(2)
    });
  },

  toggleSelect: function(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.currentTarget.dataset.value;

    console.log('ToggleSelect triggered via bindtap:', index, value);

    const items = JSON.parse(JSON.stringify(this.data.cartItems));
    items[index].selected = value;

    let allSelected = true;
    items.forEach(item => {
      if (!item.selected) allSelected = false;
    });

    this.setData({
      cartItems: items,
      selectAll: allSelected && items.length > 0
    }, () => {
      this.updateTotalPrice(items);
    });
  },

  toggleSelectAll: function(e) {
    const isAllSelected = e.currentTarget.dataset.value;
    console.log('ToggleSelectAll triggered via bindtap:', isAllSelected);

    const items = JSON.parse(JSON.stringify(this.data.cartItems));
    items.forEach(item => {
      item.selected = isAllSelected;
    });

    this.setData({
      cartItems: items,
      selectAll: isAllSelected
    }, () => {
      this.updateTotalPrice(items);
    });
  },

  escape: function(str) {
    if (!str) return '';
    return str.replace(/'/g, "''");
  },

  goHome: function() {
    wx.navigateBack();
  },

  deleteItem: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定要删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          wx.cloud.callFunction({
            name: 'shangcheng',
            data: {
              query: `DELETE FROM dingdan WHERE ddh = '${id}'`
            },
            success: () => {
              wx.showToast({ title: '删除成功' });
              this.fetchCartData();
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
  },

  checkout: function() {
    const selectedItems = this.data.cartItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      wx.showToast({ title: '请选择要结算的商品', icon: 'none' });
      return;
    }

    const user = wx.getStorageSync('userLoginInfo') || {};
    const khmc = user.userName;

    if (!khmc) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 将选中的商品数据转换为字符串，通过 URL 传递
    // 注意：URL 长度有限制，如果商品过多，建议使用全局状态管理或临时存储
    const itemsData = encodeURIComponent(JSON.stringify(selectedItems));
    const total = this.data.totalPrice;

    wx.navigateTo({
      url: `/pages/checkout/checkout?items=${itemsData}&total=${total}`
    });
  }
})
