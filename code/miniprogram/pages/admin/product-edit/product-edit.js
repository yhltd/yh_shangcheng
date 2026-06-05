Page({
  data: {
    productId: null,
    categoryIndex: -1,
    subCategoryIndex: -1,
    categories: [
      { id: 1, name: '餐饮', icon: '🍱' },
      { id: 2, name: '服装', icon: '👕' },
      { id: 3, name: '体育', icon: '🏀' },
      { id: 4, name: '医疗', icon: '🏥' },
      { id: 5, name: '保健', icon: '💊' },
      { id: 6, name: '娱乐', icon: '🎮' },
      { id: 7, name: '电子', icon: '📱' },
      { id: 8, name: '家庭', icon: '🏠' }
    ],
    subCategories: [],
    showUrlModal: false,
    tempUrl: '',
    targetImageUrlField: '',
    product: {
      mingcheng: '',
      xiangqing: '',
      fenlei: '',
      yuanjia: '',
      zhekou: '',
      shuliang: '',
      ztu: '',
      ltu1: '',
      ltu2: '',
      ltu3: '',
      beizhu: ''
    },
    carouselIndex: 0,
    carouselTimer: null,
  },

  onLoad: function(options) {
    this.startCarouselTimer();
    if (options && options.id) {
      this.setData({
        productId: options.id
      });
      this.fetchProductDetail(options.id);
    } else {
      console.error('Product ID missing in onLoad options');
      wx.navigateBack({
        fail: () => {
          wx.reLaunch({ url: '/pages/admin/product-manage/product-manage' });
        }
      });
    }
  },

  startCarouselTimer: function() {
    if (this.data.carouselTimer) {
      clearInterval(this.data.carouselTimer);
    }
    this.data.carouselTimer = setInterval(() => {
      const current = this.data.carouselIndex;
      this.setData({
        carouselIndex: (current + 1) % 5
      });
    }, 3000);
    this.setData({ carouselTimer: this.data.Timer });
  },

  stopCarouselTimer: function() {
    if (this.data.carouselTimer) {
      clearInterval(this.data.carouselTimer);
      this.setData({ carouselTimer: null });
    }
  },

  onUnload: function() {
    this.stopCarouselTimer();
  },

  fetchProductDetail: function(id) {
    wx.showLoading({ title: '加载中...' });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT * FROM shangpin WHERE id = ${id}`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        const product = data ? data[0] : null;
        if (product) {
          this.setData({ product: product });

          const catIndex = this.data.categories.findIndex(c => c.name === product.fenlei);
          if (catIndex !== -1) {
            this.setData({ categoryIndex: catIndex });
            this.fetchSubCategories(product.fenlei);

            const timer = setInterval(() => {
              if (this.data.subCategories.length > 0) {
                const subIndex = this.data.subCategories.indexOf(product.fenlei2);
                if (subIndex !== -1) {
                  this.setData({ subCategoryIndex: subIndex });
                }
                clearInterval(timer);
              }
            }, 100);
            setTimeout(() => clearInterval(timer), 3000);
          }
        } else {
          wx.showToast({ title: '商品不存在', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('Fetch detail failed', err);
        wx.showToast({ title: '获取详情失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  onCategoryChange: function(e) {
    const index = e.detail.value;
    const category = this.data.categories[index];
    this.setData({
      categoryIndex: index,
      [`product.fenlei`]: category.name,
      subCategoryIndex: -1,
      subCategories: []
    });
    this.fetchSubCategories(category.name);
  },

  onSubCategoryChange: function(e) {
    const index = e.detail.value;
    const subCategory = this.data.subCategories[index];
    this.setData({
      subCategoryIndex: index,
      [`product.fenlei2`]: subCategory
    });
  },

  fetchSubCategories: function(categoryName) {
    wx.showLoading({ title: '加载中...', mask: true });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT fenlei2 FROM fenlei WHERE fenlei1 = '${categoryName}'`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0) {
          const subs = data.map(item => item.fenlei2);
          this.setData({ subCategories: subs });
        } else {
          this.setData({ subCategories: [] });
        }
      },
      fail: (err) => {
        console.error('Fetch subcategories failed', err);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  onInputChange: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`product.${field}`]: e.detail.value
    });
  },

  // 修改：统一为私有服务器动态路径上传
  uploadImage: function(e) {
    const field = e.currentTarget.dataset.field;
    const that = this;

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;

        wx.showLoading({ title: '上传中...', mask: true });

        // 1. 构建动态路径 (与 profile.js 统一)
        const user = wx.getStorageSync('userLoginInfo') || {};
        const companyName = user.dianpu || 'DefaultShop';
        const account = user.userAccount || 'admin';

        // 路径格式：/shangcheng/公司名/商品ID_字段名.jpg
        const dynamicPath = `/shangcheng/${companyName}/`;
        const finalFileName = `${that.data.productId}_${field}.jpg`;
        const fileUrl = `http://yhocn.cn:9088/shangcheng/${companyName}/${finalFileName}`;

        // 2. 使用 wx.uploadFile 上传到私有服务器
        wx.uploadFile({
          url: 'https://yhocn.cn:9097/file/upload',
          filePath: tempFilePath,
          name: 'file',
          formData: {
            name: finalFileName,
            path: dynamicPath,
            kongjian: '3',
            timestamp: Date.now()
          },
          success: (uploadRes) => {
            try {
              const resData = JSON.parse(uploadRes.data);
              if (resData.code === 200 || resData.success) {
                // 3. 将构建的 URL 绑定到商品字段
                that.setData({
                  [`product.${field}`]: fileUrl
                });
                wx.showToast({ title: '上传成功', icon: 'success' });
              } else {
                throw new Error(resData.msg || '服务器响应错误');
              }
            } catch (e) {
              console.error('解析响应失败', e);
              wx.showToast({ title: '上传失败: ' + e.message, icon: 'none' });
            }
          },
          fail: (err) => {
            console.error('网络上传失败', err);
            wx.showToast({ title: '网络上传失败', icon: 'none' });
          },
          complete: () => {
            wx.hideLoading();
          }
        });
      }
    });
  },

  openUrlInput: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      showUrlModal: true,
      targetImageUrlField: field,
      tempUrl: this.data.product[field] || ''
    });
  },

  onUrlInput: function(e) {
    this.setData({ tempUrl: e.detail.value });
  },

  closeUrlModal: function() {
    this.setData({ showUrlModal: false });
  },

  saveUrlImage: function() {
    const url = this.data.tempUrl;
    const field = this.data.targetImageUrlField;

    if (!url) {
      wx.showToast({ title: '请输入图片URL', icon: 'none' });
      return;
    }

    this.setData({
      [`product.${field}`]: url,
      showUrlModal: false
    });
    wx.showToast({ title: 'URL已设置', icon: 'success' });
  },

  deleteImage: function(e) {
    const field = e.currentTarget.dataset.field;
    const that = this;
    const currentUrl = this.data.product[field];

    wx.showModal({
      title: '确认删除',
      content: '确定要清空这张图片吗？这将同时删除服务器上的物理文件。',
      success: (res) => {
        if (res.confirm) {
          if (!currentUrl) {
            that.setData({ [`product.${field}`]: '' });
            wx.showToast({ title: '已删除', icon: 'success' });
            return;
          }
          that.handlePhysicalImageDelete(currentUrl, field);
        }
      }
    });
  },

  handlePhysicalImageDelete: function(fileUrl, field) {
    const that = this;

    // 1. 从 URL 中提取文件名
    const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
    const cleanFileName = fileName.split('.')[0]; // 移除扩展名

    // 2. 获取公司名以构建正确的删除路径
    const user = wx.getStorageSync('userLoginInfo') || {};
    const companyName = user.dianpu || 'DefaultShop';
    const dynamicPath = `/shangcheng/${companyName}/`;

    wx.showLoading({ title: '正在删除物理文件...', mask: true });

    // 3. 调用物理删除接口
    wx.request({
      url: `https://yhocn.cn:9097/file/delete?order_number=${cleanFileName}&path=${encodeURIComponent(dynamicPath)}`,
      method: 'POST',
      header: { 'content-type': 'application/x-www-form-urlencoded' },
      success: (res) => {
        console.log('物理删除响应:', res.data);
        that.setData({ [`product.${field}`]: '' });
        wx.showToast({ title: '已彻底删除', icon: 'success' });
      },
      fail: (err) => {
        console.error('物理删除请求失败:', err);
        that.setData({ [`product.${field}`]: '' });
        wx.showToast({ title: '图片已移除', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });

  },

  handleSubmit: function() {
    const p = this.data.product;

    if (!p.mingcheng || !p.yuanjia) {
      wx.showToast({ title: '请填写必填项', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    let user = wx.getStorageSync('userLoginInfo') || {};
    let dianpu = user.dianpu || 'DefaultShop';

    const sql = `UPDATE shangpin SET
              mingcheng = '${this.escape(p.mingcheng)}',
              xiangqing = '${this.escape(p.xiangqing)}',
              fenlei = '${this.escape(p.fenlei)}',
              fenlei2 = '${this.escape(p.fenlei2)}',
              yuanjia = ${this.num(p.yuanjia)},
              zhekou = ${this.num(p.zhekou)},
              shuliang = ${this.num(p.shuliang)},
              ztu = '${this.escape(p.ztu)}',
              ltu1 = '${this.escape(p.ltu1)}',
              ltu2 = '${this.escape(p.ltu2)}',
              ltu3 = '${this.escape(p.ltu3)}',
              beizhu = '${this.escape(p.beizhu)}',
              dianpu = '${this.escape(dianpu)}'
             WHERE id = ${this.data.productId}`;

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: sql
      },
      success: (res) => {
        wx.showToast({ title: '更新成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack({
            fail: () => {
              wx.reLaunch({ url: '/pages/admin/product-manage/product-manage' });
            }
          });
        }, 1500);
      },
      fail: (err) => {
        console.error('Submit failed', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  escape: function(str) {
    if (!str) return '';
    return str.replace(/'/g, "''");
  },

  num: function(val) {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
})
