Page({
  data: {
    categories: [],
    selectedCategory: null,
    subCategories: [],
    products: [],
    showProducts: false,
    selectedSubCategory: null,
    // 管理员相关
    canAdmin: false,
    isAdminMode: false,
    showEdit: false,
    editingId: null,
    editingUrl: ''
  },

  onLoad: function(options) {
    // 1. 权限校验
    const loginInfo = wx.getStorageSync('userLoginInfo');
    if (loginInfo) {
      this.setData({
        canAdmin: loginInfo.role === '超级管理员'
      });
    }
    // 2. 加载动态分类
    this.fetchCategories();
  },

  fetchCategories: function() {
    const query = "SELECT id, fenleiname as name, tubiaourl as icon FROM sucaiurl WHERE qiyong = 1 AND type = 'category' ORDER BY paixuhao ASC";
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: { query: query },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data) {
          this.setData({ categories: data });
        }
      },
      fail: (err) => {
        console.error('Fetch categories failed', err);
      }
    });
  },

  onCategoryTap: function(e) {
    const index = e.currentTarget.dataset.index;
    const category = this.data.categories[index];

    // 如果处于编辑模式，点击分类触发修改图标
    if (this.data.isAdminMode === 'admin' || this.data.isAdminMode) {
      this.editIcon(category);
      return;
    }

    this.setData({
      selectedCategory: category,
      showProducts: false,
      selectedSubCategory: null
    });

    // --- 修改点：如果是“全部”，直接加载所有商品，不显示子类 ---
    if (category.name === '全部') {
      this.showAllProducts();
    } else {
      this.fetchSubCategories(category.name);
    }
  },

  // --- 管理功能 ---
  toggleAdminMode: function() {
    const newMode = !this.data.isAdminMode;
    this.setData({
      isAdminMode: newMode
    });
    wx.setStorageSync('globalIsAdminMode', newMode);
  },

  // 修改：升级为私有服务器动态路径上传
  editIcon: function(category) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadAndSaveIcon(category.id, tempFilePath);
      }
    });
  },

  uploadAndSaveIcon: function(id, filePath) {
    wx.showLoading({ title: '上传图标中...', mask: true });

    // 构建动态路径：/shangcheng/category/cat_{id}.jpg
    const dynamicPath = `/shangcheng/category/`;
    const finalFileName = `cat${id}.jpg`;
    const fileUrl = `http://yhocn.cn:9088/shangcheng/category/${finalFileName}`;

    wx.uploadFile({
      url: 'https://yhocn.cn:9097/file/upload',
      filePath: filePath,
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

            // 更新数据库 sucaiurl 表
            wx.cloud.callFunction({
              name: 'shangcheng',
              data: {
                query: `UPDATE sucaiurl SET tubiaourl = '${fileUrl}' WHERE id = ${id}`
              },
              success: () => {
                wx.showToast({ title: '图标更新成功', icon: 'success' });
                this.fetchCategories();
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

  confirmDeleteIcon: function(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除 [${name}] 分类图标吗？这将同时删除服务器上的图片文件。`,
      success: (res) => {
        if (res.confirm) {
          this.handleFullDelete(id);
        }
      }
    });
  },

  handleFullDelete: function(id) {
    const that = this;
    wx.showLoading({ title: '正在彻底删除...', mask: true });

    // 1. 构建物理文件信息 (与首页同步：cat{id}.jpg)
    const cleanFileName = `cat${id}`;
    const dynamicPath = '/shangcheng/category/';

    // 2. 先尝试删除服务器物理文件
    wx.request({
      url: `https://yhocn.cn:9097/file/delete?order_number=${cleanFileName}&path=${encodeURIComponent(dynamicPath)}`,
      method: 'POST',
      header: { 'content-type': 'application/x-www-form-urlencoded' },
      success: (res) => {
        console.log('物理删除响应:', res.data);
        // 无论物理文件是否删除成功，都继续清理数据库，防止死数据
        that.finalizeDatabaseDelete(id);
      },
      fail: (err) => {
        console.error('物理删除请求失败:', err);
        that.finalizeDatabaseDelete(id);
      }
    });
  },

  finalizeDatabaseDelete: function(id) {
    const that = this;
    const query = `DELETE FROM sucaiurl WHERE id = ${id}`;
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: { query: query },
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '删除成功', icon: 'success' });
        that.fetchCategories();
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('数据库删除失败', err);
        wx.showToast({ title: '数据库删除失败', icon: 'none' });
      }
    });
  },
  // --- 子类管理功能
  handleAddSubCategory: function() {
    if (!this.data.selectedCategory) {
      wx.showToast({ title: '请先选择一个主分类', icon: 'none' });
      return;
    }
    const categoryName = this.data.selectedCategory.name;
    wx.showModal({
      title: '添加子分类',
      content: `为 [${categoryName}] 添加新的子类`,
      editable: true,
      placeholderText: '请输入子类名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const newSubName = res.content.trim();
          if (!newSubName) {
            wx.showToast({ title: '名称不能为空', icon: 'none' });
            return;
          }
          this.saveSubCategory(categoryName, newSubName);
        }
      }
    });
  },

  saveSubCategory: function(cat1, cat2) {
    wx.showLoading({ title: '保存中...', mask: true });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `INSERT INTO fenlei (fenlei1, fenlei2) VALUES ('${cat1}', '${cat2}')`
      },
      success: () => {
        wx.showToast({ title: '添加成功', icon: 'success' });
        this.fetchSubCategories(cat1);
      },
      fail: (err) => {
        console.error('Save subcategory failed', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      },
      complete: () => wx.hideLoading()
    });
  },

  confirmDeleteSubCategory: function(e) {
    const subName = e.currentTarget.dataset.name;
    const catName = this.data.selectedCategory.name;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除子类 [${subName}] 吗？注意：该分类下的商品将无法在分类页通过此子类找到。`,
      success: (res) => {
        if (res.confirm) {
          this.deleteSubCategory(catName, subName);
        }
      }
    });
  },

  deleteSubCategory: function(cat1, cat2) {
    wx.showLoading({ title: '删除中...', mask: true });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `DELETE FROM fenlei WHERE fenlei1 = '${cat1}' AND fenlei2 = '${cat2}'`
      },
      success: () => {
        wx.showToast({ title: '删除成功', icon: 'success' });
        this.fetchSubCategories(cat1);
      },
      fail: (err) => {
        console.error('Delete subcategory failed', err);
        wx.showToast({ title: '删除失败', icon: 'none' });
      },
      complete: () => wx.hideLoading()
    });
  },

  // 新增：加载全部商品的方法
  showAllProducts: function() {
    this.setData({
      showProducts: true,
      selectedSubCategory: '全部商品'
    });
    this.fetchAllProducts();
  },

  fetchAllProducts: function() {
    wx.showLoading({ title: '加载全部商品中...' });
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT * FROM shangpin`
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
        console.error('Fetch all products failed', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
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
          wx.showToast({ title: '暂无子分类', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('Fetch subcategories failed', err);
        wx.showToast({ title: '加载子类失败', icon: 'none' });
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
