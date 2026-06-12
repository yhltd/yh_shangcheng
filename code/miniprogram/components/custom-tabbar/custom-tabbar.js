Component({
  properties: {
    active: {
      type: Number,
      value: 0
    }
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const tabs = [
        '/pages/index/index',
        '/pages/category/category',
        '/pages/cart/cart',
        '/pages/user/user'
      ];

      if (this.data.active !== index) {
        wx.reLaunch({
          url: tabs[index]
        });
      }
    }
  }
})
