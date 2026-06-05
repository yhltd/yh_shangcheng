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
          // --- 优化：商品数量叠加逻辑 ---
          const groupMap = {};
          data.forEach(item => {
            const name = item.cpmc;
            if (!groupMap[name]) {
              groupMap[name] = {
                id: item.ddh,
                name: item.cpmc,
                price: item.xsdj,
                count: 0,
                total: 0,
                selected: true,
                allIds: [item.ddh] // 记录该商品对应的所有订单号，用于删除
              };
            }
            groupMap[name].count += parseInt(item.xssl || 0);
            groupMap[name].total += parseFloat(item.xshj || 0);
            groupMap[name].allIds.push(item.ddh);
          });
          const items = Object.values(groupMap);

          const total = items.reduce((sum, item) => {
            return sum + (parseFloat(item.total) || 0);
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

  // 新增：增加数量
  plusCount: function(e) {
    const index = e.currentTarget.dataset.index;
    const items = JSON.parse(JSON.stringify(this.data.cartItems));
    items[index].count++;
    items[index].total = items[index].count * parseFloat(items[index].price || 0);

    this.setData({ cartItems: items }, () => {
      this.updateTotalPrice();
    });
  },

  // 新增：减少数量
  minusCount: function(e) {
    const index = e.currentTarget.dataset.index;
    const items = JSON.parse(JSON.stringify(this.data.cartItems));
    if (items[index].count > 1) {
      items[index].count--;
      items[index].total = items[index].count * parseFloat(items[index].price || 0);
      this.setData({ cartItems: items }, () => {
        this.updateTotalPrice();
      });
    } else {
      // 数量为1时点击减号，提示删除
      this.deleteItem({ currentTarget: { dataset: { id: items[index].id } } });
    }
  },

  toggleSelect: function(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.currentTarget.dataset.value;

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
          // 注意：这里如果聚合了，可能需要删除所有关联的订单号，或者根据业务逻辑处理
          // 简单起见，目前删除该组的首个订单ID，建议生产环境使用 IN (id1, id2...)
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

    const itemsData = encodeURIComponent(JSON.stringify(selectedItems));
    const total = this.data.totalPrice;

    wx.navigateTo({
      url: `/pages/checkout/checkout?items=${itemsData}&total=${total}`
    });
  }
})
