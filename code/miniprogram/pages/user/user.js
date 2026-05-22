Page({
  data: {
    userInfo: {
      nickName: '商务用户',
      userAccount: '123456',
      avatarUrl: '',
      role: ''
    },
    showAddressModal: false,
    currentAddress: ''
  },

  onShow: function() {
    const loginInfo = wx.getStorageSync('userLoginInfo');
    if (loginInfo) {
      this.syncDianpuInfo(loginInfo.userAccount);
      this.setData({
        'userInfo.nickName': loginInfo.userName,
        'userInfo.userAccount': loginInfo.userAccount,
        'userInfo.role': loginInfo.role
      });
    }
  },

  syncDianpuInfo: function(account) {
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT dianpu FROM login WHERE zhanghao = '${account}'`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0) {
          const dianpu = data[0].dianpu;
          const loginInfo = wx.getStorageSync('userLoginInfo') || {};
          loginInfo.dianpu = dianpu;
          wx.setStorageSync('userLoginInfo', loginInfo);
          // 同时兼容您之前在 product-manage 中使用的 'user' 缓存键
          const user = wx.getStorageSync('user') || {};
          user.dianpu = dianpu;
          wx.setStorageSync('user', user);
          console.log('Dianpu sync success:', dianpu);
        }
      },
      fail: (err) => {
        console.error('Sync dianpu failed', err);
      }
    });
  },

  onLoad: function() {
    this.onShow();
  },

  goToProfile: function() {
    wx.navigateTo({
      url: '/pages/user/profile/profile'
    });
  },

  goToAdmin: function() {
    wx.reLaunch({
      url: '/pages/admin/main/main'
    });
  },

  goToAddress: function() {
    const loginInfo = wx.getStorageSync('userLoginInfo');
    if (!loginInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加载中...' });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT shdz FROM login WHERE zhanghao = '${loginInfo.userAccount}'`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        const address = (data && data.length > 0) ? data[0].shdz : '';
        this.setData({
          currentAddress: address,
          showAddressModal: true
        });
      },
      fail: (err) => {
        console.error('Fetch address failed', err);
        wx.showToast({ title: '获取地址失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  onAddressInput: function(e) {
    this.setData({
      currentAddress: e.detail.value
    });
  },

  closeAddressModal: function() {
    this.setData({
      showAddressModal: false
    });
  },

  saveAddress: function() {
    const loginInfo = wx.getStorageSync('userLoginInfo');
    const address = this.data.currentAddress;

    if (!address) {
      wx.showToast({ title: '地址不能为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `UPDATE login SET shdz = '${address}' WHERE zhanghao = '${loginInfo.userAccount}'`
      },
      success: (res) => {
        wx.showToast({ title: '更新成功', icon: 'success' });
        this.closeAddressModal();
      },
      fail: (err) => {
        console.error('Update address failed', err);
        wx.showToast({ title: '更新失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  goToOrders: function() {
    wx.navigateTo({
      url: '/pages/orderHistory/orderHistory'
    });
  },

  goToAbout: function() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  goToMerchantApply: function() {
    wx.navigateTo({
      url: '/pages/merchant-apply/merchant-apply'
    });
  }
})
