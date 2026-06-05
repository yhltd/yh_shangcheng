Page({
  data: {
    userInfo: {
      nickName: '',
      userAccount: '',
      mima: '',
      avatarUrl: 'https://cdn-icons-png.flaticon.com/128/149/149071.png'
    },
    showUrlModal: false,
    tempUrl: ''
  },

  onLoad: function() {
    const loginInfo = wx.getStorageSync('userLoginInfo');
    if (loginInfo) {
      this.setData({
        'userInfo.nickName': loginInfo.userName,
        'userInfo.userAccount': loginInfo.userAccount,
        'userInfo.mima': loginInfo.password || '******'
      });

      // 尝试从数据库加载真实头像
      this.fetchUserAvatar(loginInfo.userAccount);
    }
  },

  fetchUserAvatar: function(account) {
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT touxiang FROM login WHERE zhanghao = '${account}'`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0 && data[0].touxiang) {
          this.setData({ 'userInfo.avatarUrl': data[0].touxiang });
        }
      }
    });
  },

  onInputChange: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`userInfo.${field}`]: e.detail.value
    });
  },

  openAvatarUrlModal: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadAndSaveAvatar(tempFilePath);
      }
    });
  },

  uploadAndSaveAvatar: function(filePath) {
    wx.showLoading({ title: '上传头像中...', mask: true });

    const loginInfo = wx.getStorageSync('userLoginInfo');
    const account = loginInfo.userAccount;
    const companyName = loginInfo.dianpu || 'DefaultCompany';

    // 1. 构建动态路径和文件名 (与简历管理一致)
    const dynamicPath = `/shangcheng/${companyName}/`;
    const finalFileName = `${account}_touxiang.jpg`;
    const fileUrl = `http://yhocn.cn:9088/shangcheng/${companyName}/${finalFileName}`;

    // 2. 使用 wx.uploadFile 上传到私有服务器
    wx.uploadFile({
      url: 'https://yhocn.cn:9097/file/upload',
      filePath: filePath,
      name: 'file',
      formData: {
        name: finalFileName,
        path: dynamicPath,
        kongjian: '3', // 沿用简历管理的空间ID
        timestamp: Date.now()
      },
      success: (uploadRes) => {
        try {
          const resData = JSON.parse(uploadRes.data);
          if (resData.code === 200 || resData.success) {

            // 3. 将构建好的 URL 保存到数据库
            wx.cloud.callFunction({
              name: 'shangcheng',
              data: {
                query: `UPDATE login SET touxiang = '${fileUrl}' WHERE zhanghao = '${account}'`
              },
              success: () => {
                this.setData({ 'userInfo.avatarUrl': fileUrl });
                wx.showToast({ title: '头像更新成功', icon: 'success' });

                loginInfo.avatarUrl = fileUrl;
                wx.setStorageSync('userLoginInfo', loginInfo);
              },
              fail: (err) => {
                console.error('DB Update failed', err);
                wx.showToast({ title: '数据库保存失败', icon: 'none' });
              },
              complete: () => wx.hideLoading()
            });
          } else {
            throw new Error(resData.msg || '服务器响应错误');
          }
        } catch (e) {
          console.error('解析响应失败', e);
          wx.hideLoading();
          wx.showToast({ title: '上传失败: ' + e.message, icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('网络上传失败', err);
        wx.hideLoading();
        wx.showToast({ title: '网络上传失败', icon: 'none' });
      }
    });
  },

  onUrlInput: function(e) {
    this.setData({ tempUrl: e.detail.value });
  },

  closeAvatarModal: function() {
    this.setData({ showUrlModal: false });
  },

  saveAvatarUrl: function() {
    if (!this.data.tempUrl) {
      wx.showToast({ title: '请输入URL', icon: 'none' });
      return;
    }
    this.setData({
      'userInfo.avatarUrl': this.data.tempUrl,
      showUrlModal: false
    });
    wx.showToast({ title: '已设置', icon: 'success' });
  },

  deleteAvatar: function() {
    const that = this;
    const currentUrl = this.data.userInfo.avatarUrl;

    if (!currentUrl || currentUrl.includes('cdn-icons-png.flaticon.com')) {
      wx.showToast({ title: '无需删除默认头像', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除个人头像吗？这将同时抹除服务器上的物理文件。',
      success: (res) => {
        if (res.confirm) {
          that.handlePhysicalAvatarDelete(currentUrl);
        }
      }
    });
  },

  handlePhysicalAvatarDelete: function(fileUrl) {
    const that = this;
    const loginInfo = wx.getStorageSync('userLoginInfo');
    const companyName = loginInfo.dianpu || 'DefaultCompany';

    // 1. 提取文件名
    const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
    const cleanFileName = fileName.split('.')[0];
    const dynamicPath = `/shangcheng/${companyName}/`;

    wx.showLoading({ title: '正在删除...', mask: true });

    // 2. 调用物理删除接口
    wx.request({
      url: 'https://yhocn.cn:9097/file/delete',
      method: 'POST',
      data: {
        order_number: cleanFileName,
        path: dynamicPath
      },
      header: { 'content-type': 'application/json' },
      success: (res) => {
        console.log('物理删除响应:', res.data);
        // 无论物理文件删除结果如何，都同步更新界面和数据库，确保用户体验
        that.finalizeAvatarDelete();
      },
      fail: (err) => {
        console.error('物理删除失败:', err);
        that.finalizeAvatarDelete();
      }
    });
  },

  finalizeAvatarDelete: function() {
    const that = this;
    const loginInfo = wx.getStorageSync('userLoginInfo');
    const account = loginInfo.userAccount;
    const defaultAvatar = 'https://cdn-icons-png.flaticon.com/128/149/149071.png';

    // 更新数据库，将头像设为空或默认头像
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `UPDATE login SET touxiang = '' WHERE zhanghao = '${account}'`
      },
      success: () => {
        wx.hideLoading();
        that.setData({ 'userInfo.avatarUrl': defaultAvatar });
        loginInfo.avatarUrl = defaultAvatar;
        wx.setStorageSync('userLoginInfo', loginInfo);
        wx.showToast({ title: '头像已彻底删除', icon: 'success' });
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '数据库更新失败', icon: 'none' });
      }
    });
  },

  doUpdate: function() {
    const { userInfo } = this.data;
    if (!userInfo.nickName || !userInfo.userAccount || !userInfo.mima) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

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

        wx.showLoading({ title: '更新中...' });
        wx.cloud.callFunction({
          name: 'shangcheng',
          data: {
            query: `UPDATE login SET yonghuming = '${userInfo.nickName}', zhanghao = '${userInfo.userAccount}', mima = '${userInfo.mima}', touxiang = '${userInfo.avatarUrl}' WHERE zhanghao = '${originalAccount}'`
          },
          success: res => {
            wx.hideLoading();
            wx.showToast({ title: '更新成功', icon: 'success' });

            const loginInfo = wx.getStorageSync('userLoginInfo');
            loginInfo.userName = userInfo.nickName;
            loginInfo.userAccount = userInfo.userAccount;
            loginInfo.password = userInfo.mima;
            loginInfo.avatarUrl = userInfo.avatarUrl;
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
