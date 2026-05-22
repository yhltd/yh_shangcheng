Page({
  data: {
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
    selectedCategory: null,
    subCategories: [],
    products: [],
    showProducts: false,
    selectedSubCategory: null
  },

  onCategoryTap: function(e) {
    const index = e.currentTarget.dataset.index;
    const category = this.data.categories[index];

    this.setData({
      selectedCategory: category,
      showProducts: false,
      selectedSubCategory: null
    });

    this.fetchSubCategories(category.name);
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
          this.setData({
            subCategories: subs
          });
        } else {
          this.setData({
            subCategories: []
          });
          wx.showToast({
            title: '暂无子分类',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Fetch subcategories failed', err);
        wx.showToast({
          title: '加载子类失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  onSubCategoryTap: function(e) {
    const subCategory = e.currentTarget.dataset.name;
    this.setData({
      selectedSubCategory: subCategory,
      showProducts: true
    });
    this.fetchProducts(this.data.selectedCategory.name, subCategory);
  },

  onBackToSub: function() {
    this.setData({
      showProducts: false,
      selectedSubCategory: null
    });
  },

  fetchProducts: function(fenlei, fenlei2) {
    wx.showLoading({ title: '加载商品中...' });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT * FROM shangpin WHERE fenlei = '${fenlei}' AND fenlei2 = '${fenlei2}'`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        this.setData({
          products: data ? data.map(item => ({
            id: item.id,
            name: item.mingcheng,
            price: item.yuanjia,
            img: item.ztu,
            zhekou: item.zhekou
          })) : []
        });
      },
      fail: (err) => {
        console.error('Fetch products failed', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/productDetail/productDetail?id=${id}`
    });
  }
})
