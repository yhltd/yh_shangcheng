Page({
  data: {
    userInfo: {
      nickName: '',
      userAccount: '',
      mima: '',
      avatarUrl: 'https://cdn-icons-png.flaticon.com/128/149/149071.png'
    }
  },

  onLoad: function() {
    const loginInfo = wx.getStorageSync('userLoginInfo');
    if (loginInfo) {
      // 为了演示，密码从缓存或模拟获取，实际生产环境不建议在缓存存明文密码
      // 这里假设注册登录时我们也把密码存入了缓存以便修改，或者此处从数据库重新查询一次
      this.setData({
        'userInfo.nickName': loginInfo.userName,
        'userInfo.userAccount': loginInfo.userAccount,
        'userInfo.mima': loginInfo.password || '******'
      });
    }
  },

  onInputChange: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`userInfo.${field}`]: e.detail.value
    });
  },

  doUpdate: function() {
    const { userInfo } = this.data;
    if (!userInfo.nickName || !userInfo.userAccount || !userInfo.mima) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    // 1. 账号和密码一致性校验
    if (userInfo.userAccount === userInfo.mima) {
      wx.showModal({
        title: '修改失败',
        content: '账号和密码不能相同，请重新设置',
        showCancel: false
      });
      return;
    }

    wx.showLoading({ title: '校验中...' });

    const originalAccount = wx.getStorageSync('userLoginInfo').userAccount;

    // 2. 检查新账号+新密码拼接后是否已被他人占用 (排除掉用户自己)
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT * FROM login WHERE (zhanghao + mima) = '${userInfo.userAccount}${userInfo.mima}' AND zhanghao != '${originalAccount}'`
      },
      success: checkRes => {
        const recordsets = checkRes.result.recordsets;
        if (recordsets && recordsets[0] && recordsets[0].length > 0) {
          wx.hideLoading();
          wx.showModal({
            title: '修改失败',
            content: '该账号和密码已被占用，请更换',
            showCancel: false
          });
          return;
        }

        // 3. 执行更新
        wx.showLoading({ title: '更新中...' });
        wx.cloud.callFunction({
          name: 'shangcheng',
          data: {
            query: `UPDATE login SET yonghuming = '${userInfo.nickName}', zhanghao = '${userInfo.userAccount}', mima = '${userInfo.mima}' WHERE zhanghao = '${originalAccount}'`
          },
          success: res => {
            wx.hideLoading();
            wx.showToast({ title: '更新成功', icon: 'success' });

            const loginInfo = wx.getStorageSync('userLoginInfo');
            loginInfo.userName = userInfo.nickName;
            loginInfo.userAccount = userInfo.userAccount;
            loginInfo.password = userInfo.mima;
            wx.setStorageSync('userLoginInfo', loginInfo);
          },
          fail: err => {
            wx.hideLoading();
            wx.showToast({ title: '更新失败', icon: 'error' });
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'error' });
      }
    });
  }
})
