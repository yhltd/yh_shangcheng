Page({
  data: {
    searchKeyword: '',
    currentCategory: '全部',
    showLoginModal: false,
    showRegisterModal: false,
    passwordVisible: false,
    account: '',
    password: '',
    regName: '',
    regAccount: '',
    regPassword: '',
    userName: '刘改',
    userAccount: 'user2',
    canAdmin: false,
    filteredProducts: [],
    hotProducts: [],
    banners: [
      {
        title: '夏季办公季特惠',
        subtitle: '精选办公设备，最高立减￥500',
        img: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',
        tag: '限时'
      },
      {
        title: '企业数字化升级',
        subtitle: '专业云端存储方案，高效协作',
        img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        tag: '热门'
      },
      {
        title: '新人首单礼包',
        subtitle: '下单即赠专业鼠标垫',
        img: 'https://images.unsplash.com/photo-1497032628192-86f?auto=format&fit=crop&w=300&q=80',
        tag: '福利'
      },
    ],
    categories: [],
    products: [
      { id: 1, name: '高端商务笔记本 Pro Max 16英寸', price: '7999.00', originalPrice: '8999.00', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=300&q=80', category: '笔记本' },
      { id: 2, name: '人体工学办公椅 护腰透气款', price: '1299.00', originalPrice: '1599.00', img: 'https://images.unsplash.com/photo-1505797924164-af339635395d?auto=format&fit=crop&w=300&q=80', category: '办公椅' },
      { id: 3, name: '4K专业设计显示器 27英寸', price: '2499.00', originalPrice: '2999.00', img: 'https://images.unsplash.com/photo-1527443297752-67a61917449d?auto=format&fit=crop&w=300&q=80', category: '显示器' },
      { id: 4, name: '静音机械键盘 商务办公版', price: '399.00', originalPrice: '499.00', img: 'https://images.unsplash.com/photo-1511467687858-23d96c367421?auto=format&fit=crop&w=300&q=80', category: '键盘' },
      { id: 5, name: '无线蓝牙静音鼠标', price: '159.00', originalPrice: '299.00', img: 'https://images.unsplash.com/photo-1527864550417-7ca67d272262?auto=format&fit=crop&w=300&q=80', category: '鼠标' },
    ]
  },

  onLoad: function(options) {
    const loginInfo = wx.getStorageSync('userLoginInfo');
    if (loginInfo) {
      this.setData({
        userName: loginInfo.userName,
        userAccount: loginInfo.userAccount,
        canAdmin: loginInfo.role === '超级管理员'
      });
    }

    if (options && (options.fenlei || options.fenlei2)) {
      this.setData({
        currentCategory: options.fenlei2 || options.fenlei || '全部'
      });
      this.fetchProducts(options.fenlei, options.fenlei2);
    } else {
      this.fetchProducts();
    }
    this.fetchHotProducts();
    this.fetchDynamicIcons();
  },

  fetchHotProducts: function() {
    var query = "SELECT TOP 5 p.id, p.mingcheng, p.yuanjia, p.ztu, " +
               " (SELECT TOP 1 z.zhekou FROM shangpin z WHERE z.id = p.id) as zhekou, " +
               "COUNT(d.id) as sales_count " +
               "FROM dingdan d " +
               "JOIN shangpin p ON d.cpmc = p.mingcheng " +
               "WHERE d.ddzt = '下单' " +
               "GROUP BY p.id, p.mingcheng, p.yuanjia, p.ztu " +
               "ORDER BY sales_count DESC";

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: { query: query },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0) {
          const hotProducts = data.map(item => {
            const originalPrice = parseFloat(item.yuanjia) || 0;
            const zhekou = parseFloat(item.zhekou);
            const hasDiscount = !isNaN(zhekou) && zhekou !== 1;
            const currentPrice = hasDiscount ? (originalPrice * zhekou).toFixed(2) : originalPrice.toFixed(2);

            return {
              id: item.id,
              name: item.mingcheng,
              price: currentPrice,
              originalPrice: originalPrice.toFixed(2),
              img: item.ztu
            };
          });
          this.setData({ hotProducts });
        }
      },
      fail: (err) => {
        console.error('Fetch hot products failed', err);
      }
    });
  },

  fetchDynamicIcons: function() {
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
        console.error('Fetch dynamic icons failed', err);
      }
    });
  },

  fetchProducts: function(fenlei = null, fenlei2 = null) {
    wx.showLoading({ title: '加载商品中...' });

    let query = 'SELECT * FROM shangpin';
    if (fenlei || fenlei2) {
      const conditions = [];
      if (fenlei) conditions.push(`fenlei = '${fenlei}'`);
      if (fenlei2) conditions.push(`fenlei2 = '${fenlei2}'`);
      query += ' WHERE ' + conditions.join(' AND ');
    }

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: query
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0) {
          const products = data.map(item => {
            const originalPrice = parseFloat(item.yuanjia) || 0;
            const zhekou = parseFloat(item.zhekou);
            const hasDiscount = !isNaN(zhekou) && zhekou !== 1;
            const currentPrice = hasDiscount ? (originalPrice * zhekou).toFixed(2) : originalPrice.toFixed(2);

            return {
              id: item.id,
              name: item.mingcheng,
              price: currentPrice,
              originalPrice: originalPrice.toFixed(2),
              img: item.ztu,
              category: item.fenlei,
              subCategory: item.fenlei2,
              zhekou: zhekou,
              shuliang: parseInt(item.shuliang) || 0,
              isSoldOut: (parseInt(item.shuliang) || 0) <= 0
            };
          });
          this.setData({ products: products });
          this.applyFilters();
        } else {
          this.setData({ products: [] });
          this.applyFilters();
        }
      },
      fail: (err) => {
        console.error('Fetch products failed', err);
        wx.showToast({ title: '加载商品失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  applyFilters: function() {
    const { products, searchKeyword, currentCategory } = this.data;
    const filtered = products.filter(p => {
      const matchCategory = currentCategory === '全部' || p.category === currentCategory || p.subCategory === currentCategory;
      const matchSearch = !searchKeyword || p.name.toLowerCase().includes(searchKeyword.toLowerCase());
      return matchCategory && matchSearch;
    });
    this.setData({ filteredProducts: filtered });
  },

  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  onLogin: function() {
    this.setData({
      showLoginModal: true,
      showRegisterModal: false
    });
  },

  closeLoginModal: function() {
    this.setData({
      showLoginModal: false,
      showRegisterModal: false
    });
  },

  togglePasswordVisibility: function() {
    this.setData({
      passwordVisible: !this.data.passwordVisible
    });
  },

  bindInputAccount: function(e) {
    this.setData({
      account: e.detail.value
    });
  },

  bindInputPassword: function(e) {
    this.setData({
      password: e.detail.value
    });
  },

  bindInputRegName: function(e) {
    this.setData({ regName: e.detail.value });
  },

  bindInputRegAccount: function(e) {
    this.setData({ regAccount: e.detail.value });
  },

  bindInputRegPassword: function(e) {
    this.setData({ regPassword: e.detail.value });
  },

  doLogin: function() {
    wx.showLoading({ title: '登录中...' });

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: "SELECT * FROM login WHERE zhanghao = '" + this.data.account + "' AND mima = '" + this.data.password + "'"
      },
      success: res => {
        wx.hideLoading();
        const recordsets = res.result.recordsets;
        if (!recordsets || recordsets.length === 0 || !recordsets[0] || recordsets[0].length === 0) {
          wx.showModal({
            title: '登录失败',
            content: '账号和密码错误，请重新输入',
            showCancel: false
          });
          return;
        }

        const userData = recordsets[0][0];
        this.setData({
          userName: userData.yonghuming,
          userAccount: userData.zhanghao,
          canAdmin: userData.shenfen === '商家',
          showLoginModal: false
        });
        wx.setStorageSync('userLoginInfo', {
          userName: userData.yonghuming,
          userAccount: userData.zhanghao,
          role: userData.shenfen
        });
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '调用失败',
          icon: 'error'
        });
      }
    });
  },

  goToRegister: function() {
    this.setData({
      showLoginModal: false,
      showRegisterModal: true
    });
  },

  onSearchClick: function() {
    this.applyFilters();
    wx.showToast({
      title: '搜索成功',
      icon: 'success'
    });
  },

  onRefreshPage: function() {
    wx.showLoading({ title: '刷新中...' });
    this.fetchProducts();
    this.fetchHotProducts();
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '已刷新',
        icon: 'success'
      });
    }, 500);
  },

  preventClick: function(e) {
    e.stopPropagation();
  },

  onCategoryTap: function(e) {
    const categoryName = e.currentTarget.dataset.name;
    this.setData({
      currentCategory: categoryName
    }, () => {
      this.applyFilters();
    });
  },

  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    const isSoldOut = e.currentTarget.dataset.isSoldOut;

    if (isSoldOut) {
      wx.showToast({ title: '商品已售罄', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/productDetail/productDetail?id=${id}`
    });
  },

  doRegister: function() {
    const { regName, regAccount, regPassword } = this.data;
    if (!regName || !regAccount || !regPassword) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    if (regAccount === regPassword) {
      wx.showModal({
        title: '注册失败',
        content: '账号和密码不能相同，请重新设置',
        showCancel: false
      });
      return;
    }

    wx.showLoading({ title: '校验中...' });

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT * FROM login WHERE (zhanghao + mima) = '${regAccount}${regPassword}'`
      },
      success: checkRes => {
        const recordsets = checkRes.result.recordsets;
        if (recordsets && recordsets[0] && recordsets[0].length > 0) {
          wx.hideLoading();
          wx.showModal({
            title: '注册失败',
            content: '该账号和密码已存在，请更换后再试',
            showCancel: false
          });
          return;
        }

        wx.showLoading({ title: '注册中...' });
        wx.cloud.callFunction({
          name: 'shangcheng',
          data: {
            query: "INSERT INTO login (yonghuming, zhanghao, mima, shenfen) VALUES ('" + regName + "', '" + regAccount + "', '" + regPassword + "', '用户')"
          },
          success: regRes => {
            wx.hideLoading();

            this.setData({
              userName: regName,
              userAccount: regAccount,
              canAdmin: false,
              showRegisterModal: false,
              showLoginModal: false,
              regName: '', regAccount: '', regPassword: ''
            });

            wx.setStorageSync('userLoginInfo', {
              userName: regName,
              userAccount: regAccount,
              role: '用户',
              password: regPassword
            });

            wx.showToast({
              title: '注册成功并已登录',
              icon: 'success'
            });
          },
          fail: err => {
            wx.hideLoading();
            wx.showToast({ title: '注册失败', icon: 'error' });
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'error' });
      }
    });
  },

  toggleAdminMode: function() {
    const newMode = !this.data.isAdminMode;
    this.setData({
      isAdminMode: newMode
    });
    wx.setStorageSync('globalIsAdminMode', newMode);
  },

  editIcon: function(e) {
    const id = e.currentTarget.dataset.id;

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadAndSaveIcon(id, tempFilePath);
      }
    });
  },

  uploadAndSaveIcon: function(id, filePath) {
    wx.showLoading({ title: '上传图标中...', mask: true });

    const dynamicPath = '/shangcheng/category/';
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

            wx.cloud.callFunction({
              name: 'shangcheng',
              data: {
                query: `UPDATE sucaiurl SET tubiaourl = '${fileUrl}' WHERE id = ${id}`
              },
              success: () => {
                wx.showToast({ title: '图标更新成功', icon: 'success' });
                this.fetchDynamicIcons();
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

  deleteIcon: function(e) {
    const id = e.currentTarget.dataset.id;
    const fileUrl = e.currentTarget.dataset.url; // 确保 wxml 中传递了 url

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该分类图标吗？这将同时将删除服务器上的图片文件。',
      success: (res) => {
        if (res.confirm) {
          this.handleFullDelete(id, fileUrl);
        }
      }
    });
  },

  handleFullDelete: function(id, fileUrl) {
    const that = this;
    if (!fileUrl) {
      console.error('删除失败：未获取到 fileUrl');
      that.finalizeDatabaseDelete(id);
      return;
    }

    wx.showLoading({ title: '正在彻底删除...', mask: true });

    // 1. 提取物理文件名 (去掉后缀)
    const fileNameWithExt = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
    const cleanFileName = fileNameWithExt.split('.')[0];
    const dynamicPath = '/shangcheng/category/';

    // 2. 关键修复：模仿“好用方法”，将参数直接拼接到 URL 后面
    // Java 后端 request.getParameter() 无法读取 JSON body，必须使用 Query String
    const url = `https://yhocn.cn:9097/file/delete?order_number=${encodeURIComponent(cleanFileName)}&path=${encodeURIComponent(dynamicPath)}`;

    console.log('--- 物理删除请求 ---');
    console.log('请求URL:', url);
    console.log('-------------------');

    wx.request({
      url: url,
      method: 'POST', // 保持 POST，但参数已经在 URL 中
      header: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      success: (res) => {
        console.log('物理删除服务器响应:', res.data);
        // 只要响应成功且 code 为 200，就执行数据库清理
        if (res.data && (res.data.code === 200 || res.data.success)) {
          console.log('物理文件删除请求发送成功');
        }
        that.finalizeDatabaseDelete(id);
      },
      fail: (err) => {
        console.error('物理删除接口请求失败:', err);
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
        that.fetchDynamicIcons();
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('数据库删除失败', err);
        wx.showToast({ title: '数据库删除失败', icon: 'none' });
      }
    });
  },

  addNewIcon: function() {
    wx.showModal({
      title: '新增分类',
      content: '请输入分类名称',
      editable: true,
      placeholderText: '例如：餐饮',
      success: (res) => {
        if (res.confirm && res.content) {
          const categoryName = res.content;
          this.chooseIconForNewCategory(categoryName);
        }
      }
    });
  },

  chooseIconForNewCategory: function(categoryName) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadAndSaveNewCategory(categoryName, tempFilePath);
      }
    });
  },

  uploadAndSaveNewCategory: function(categoryName, filePath) {
    wx.showLoading({ title: '正在创建分类...', mask: true });

    const timestamp = Date.now();
    const finalFileName = `cat_${timestamp}.jpg`;
    const dynamicPath = '/shangcheng/category/';
    const fileUrl = `http://yhocn.cn:9088/shangcheng/category/${finalFileName}`;

    wx.uploadFile({
      url: 'https://yhocn.cn:9097/file/upload',
      filePath: filePath,
      name: 'file',
      formData: {
        name: finalFileName,
        path: dynamicPath,
        kongjian: '3',
        timestamp: timestamp
      },
      success: (uploadRes) => {
        try {
          const resData = JSON.parse(uploadRes.data);
          if (resData.code === 200 || resData.success) {
            const queryInsert = `INSERT INTO sucaiurl (id, fenleiname, tubiaourl, qiyong, type, paixuhao)
                                     SELECT ISNULL(MAX(id), 0) + 1, '${categoryName}', '${fileUrl}', 1, 'category', ISNULL(MAX(paixuhao), 0) + 1
                                     FROM sucaiurl`;

            wx.cloud.callFunction({
              name: 'shangcheng',
              data: { query: queryInsert },
              success: (res) => {
                const rowsAffected = res.result && res.result.rowsAffected && res.result.rowsAffected[0];
                if (rowsAffected > 0) {
                  wx.showToast({ title: '添加成功', icon: 'success' });
                  this.fetchDynamicIcons();
                } else {
                  console.error('DB Insert success but 0 rows affected:', res.result);
                  wx.showModal({
                    title: '添加失败',
                    content: '数据库未记录任何更改，请检查数据是否重复或格式错误',
                    showCancel: false
                  });
                }
              },
              fail: (err) => {
                console.error('DB Insert failed detail:', err);
                wx.showModal({
                  title: '数据库保存失败',
                  content: JSON.stringify(err) || '未知错误',
                  showCancel: false
                });
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
  }
})