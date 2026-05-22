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
    }
  },

  onLoad: function(options) {
    if (options.id) {
      this.setData({
        productId: options.id
      });
      this.fetchProductDetail(options.id);
    } else {
      wx.showToast({ title: '商品ID缺失', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
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

          // 设置分类索引
          const catIndex = this.data.categories.findIndex(c => c.name === product.fenlei);
          if (catIndex !== -1) {
            this.setData({ categoryIndex: catIndex });
            this.fetchSubCategories(product.fenlei);

            // 异步等待子类加载后设置子类索引
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

  uploadImage: function(e) {
    const field = e.currentTarget.dataset.field;

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;

        wx.showLoading({ title: '上传中...' });

        wx.cloud.uploadFile({
          cloudPath: `products/${Date.now()}_${field}.jpg`,
          filePath: tempFilePath,
          success: (res) => {
            this.setData({
              [`product.${field}`]: res.fileID
            });
            wx.showToast({ title: '上传成功', icon: 'success' });
          },
          fail: (err) => {
            console.error('Upload failed', err);
            wx.showToast({ title: '上传失败', icon: 'none' });
          },
          complete: () => {
            wx.hideLoading();
          }
        });
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

    let user = wx.getStorageSync('user') || {};
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
