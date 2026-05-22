Page({
  data: {
    userName: ''
  },

  onLoad: function() {
    const user = wx.getStorageSync('userLoginInfo') || {};
    this.setData({
      userName: user.userName || '用户'
    });
  },

  handleApply: function() {
    const user = wx.getStorageSync('userLoginInfo') || {};
    const zhanghao = user.userAccount;

    if (!zhanghao) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认申请',
      content: '确认要将账号身份更改为商家吗？更改后您将拥有商品管理权限。',
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.updateUserRole();
        }
      }
    });
  },

  updateUserRole: function() {
    wx.showLoading({ title: '申请中...', mask: true });

    const user = wx.getStorageSync('userLoginInfo') || {};
    const zhanghao = user.userAccount;

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `UPDATE login SET shenfen = '商家' WHERE zhanghao = '${zhanghao}'`
      },
      success: (res) => {
        // 更新本地缓存同步状态
        const updatedUser = { ...user, role: '商家' };
        wx.setStorageSync('userLoginInfo', updatedUser);

        wx.showModal({
          title: '申请成功',
          content: '您的身份已成功更新为商家，现在可以前往管理后台操作商品了。',
          showCancel: false,
          success: () => {
            wx.reLaunch({
              url: '/pages/user/user'
            });
          }
        });
      },
      fail: (err) => {
        console.error('Update role failed', err);
        wx.showToast({ title: '申请失败，请稍后重试', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
})