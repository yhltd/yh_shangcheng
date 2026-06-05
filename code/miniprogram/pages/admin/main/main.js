Page({
  data: {
    modules: [
      { id: 'store', name: '独立商家', icon: '🏪', path: '/pages/merchant-store/merchant-store' },
      { id: 'prod', name: '商品管理', icon: '📦', path: '/pages/admin/product-manage/product-manage' },
      { id: 'profit', name: '盈利统计', icon: '📈', path: '/pages/admin/profit-stats/profit-stats' },
      { id: 'config', name: '信息配置', icon: '⚙️', path: '/pages/admin/info-config/info-config' }
    ],
    // 商家配置数据
    storeConfig: {
      bannerUrl: '',
      welcomeText: ''
    },
    showStoreModal: false
  },

  onLoad: function() {
    this.fetchStoreConfig();
  },

  fetchStoreConfig: function() {
    const user = wx.getStorageSync('user') || {};
    const storeName = user.dianpu;
    if (!storeName) return;

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT TOP 1 tupianurl, welcometext FROM dianpu WHERE dianpuname = '${storeName}'`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0) {
          this.setData({
            storeConfig: {
              bannerUrl: data[0].tupianurl || '',
              welcomeText: data[0].welcometext || ''
            }
          });
        }
      }
    });
  },

  onNavigate: function(e) {
    const path = e.currentTarget.dataset.path;
    wx.navigateTo({ url: path });
  },

  goBack: function() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  // --- 管理商家模块 ---
  openStoreModal: function() {
    this.setData({ showStoreModal: true });
  },

  closeStoreModal: function() {
    this.setData({ showStoreModal: false });
  },

  bindInputWelcome: function(e) {
    this.setData({
      'storeConfig.welcomeText': e.detail.value
    });
  },

  uploadStoreBanner: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.saveStoreBanner(tempFilePath);
      }
    });
  },

  deleteStoreBanner: function() {
    const that = this;
    const fileUrl = this.data.storeConfig.bannerUrl;

    if (!fileUrl) {
      wx.showToast({ title: '没有可删除的图片', icon: 'none' });
      return;
    }

    const user = wx.getStorageSync('user') || {};
    const storeName = user.dianpu;

    // 1. 从 URL 中提取文件名 (例如: store_banner_123.jpg)
    const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
    // 提取纯文件名，不含扩展名，因为接口需要 order_number (cleanFileName)
    const cleanFileName = fileName.split('.')[0];

    // 2. 构建物理路径
    const dynamicPath = "/shangcheng/store/";

    wx.showModal({
      title: '确认删除',
      content: '确定要从服务器删除这张封面图吗？此操作不可撤销。',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '正在删除...', mask: true });

          // 3. 调用私有服务器删除接口
          wx.request({
            url: `https://yhocn.cn:9097/file/delete?order_number=${cleanFileName}&path=${encodeURIComponent(dynamicPath)}`,
            method: 'POST',
            header: { 'content-type': 'application/x-www-form-urlencoded' },
            success: (res) => {
              // 无论物理删除是否返回成功，都更新前端状态，确保用户界面同步
              that.removeBannerFromDatabase(storeName);
              wx.showToast({ title: '已彻底删除', icon: 'success' });
            },
            fail: (err) => {
              wx.showToast({ title: '网络请求失败', icon: 'none' });
            },
            complete: () => wx.hideLoading()
          });

        }
      }
    });

  },

  // 新增：同步删除数据库记录
  removeBannerFromDatabase: function(storeName) {
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `UPDATE dianpu SET tupianurl = '' WHERE dianpuname = '${storeName}'`
      },
      success: () => {
        this.setData({ 'storeConfig.bannerUrl': '' });
        wx.showToast({ title: '图片已彻底删除', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '数据库更新失败', icon: 'none' });
      }
    });
  },

  saveStoreBanner: function(filePath) {
    wx.showLoading({ title: '上传中...', mask: true });
    const user = wx.getStorageSync('user') || {};
    const storeName = user.dianpu;
    const fileName = `store_banner_${Date.now()}.jpg`;
    const dynamicPath = '/shangcheng/store/';
    const fileUrl = `http://yhocn.cn:9088/shangcheng/store/${fileName}`;

    wx.uploadFile({
      url: 'https://yhocn.cn:9097/file/upload',
      filePath: filePath,
      name: 'file',
      formData: {
        name: fileName,
        path: dynamicPath,
        kongjian: '3',
        timestamp: Date.now()
      },
      success: (uploadRes) => {
        const resData = JSON.parse(uploadRes.data);
        if (resData.code === 200 || resData.success) {
          this.setData({ 'storeConfig.bannerUrl': fileUrl });
          wx.showToast({ title: '图片上传成功' });
        }
      },
      fail: () => {
        wx.showToast({ title: '上传失败', icon: 'none' });
      },
      complete: () => wx.hideLoading()
    });
  },

  saveStoreConfig: function() {
    const user = wx.getStorageSync('user') || {};
    const storeName = user.dianpu;
    const { bannerUrl, welcomeText } = this.data.storeConfig;

    wx.showLoading({ title: '保存中...' });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `IF EXISTS (SELECT 1 FROM dianpu WHERE dianpuname = '${storeName}')
                UPDATE dianpu SET tupianurl = '${bannerUrl}', welcometext = '${welcomeText}' WHERE dianpuname = '${storeName}'
                ELSE
                INSERT INTO dianpu (dianpuname, tupianurl, welcometext) VALUES ('${storeName}', '${bannerUrl}', '${welcomeText}')`
      },
      success: () => {
        wx.showToast({ title: '保存成功' });
        this.closeStoreModal();
      },
      fail: () => {
        wx.showToast({ title: '保存失败', icon: 'none' });
      },
      complete: () => wx.hideLoading()
    });
  }
})
