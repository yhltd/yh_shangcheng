Page({
  data: {
    modules: [
      { id: 'store', name: '独立商家', icon: '🏪', path: '/pages/merchant-store/merchant-store' },
      { id: 'prod', name: '商品管理', icon: '📦', path: '/pages/admin/product-manage/product-manage' },
      { id: 'profit', name: '盈利统计', icon: '📈', path: '/pages/admin/profit-stats/profit-stats' },
      { id: 'config', name: '信息配置', icon: '⚙️', path: '/pages/admin/info-config/info-config' }
    ]
  },
  onNavigate: function(e) {
    const path = e.currentTarget.dataset.path;
    wx.navigateTo({ url: path });
  },

  goBack: function() {
    wx.reLaunch({ url: '/pages/index/index' });
  }
})
