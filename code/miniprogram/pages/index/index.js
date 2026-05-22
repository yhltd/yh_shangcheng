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
    userName: '商务用户',
    userAccount: '123456',
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
        img: 'https://images.unsplash.com/photo-1497032628192-86f?auto=format&fit=crop&w=800&q=80',
        tag: '福利'
      },
    ],
    categories: [
      { id: 1, name: '餐饮', icon: 'https://cdn-icons-png.flaticon.com/128/3081/3081986.png' },
      { id: 2, name: '服装', icon: 'https://cdn-icons-png.flaticon.com/128/3050/3050235.png' },
      { id: 3, name: '体育', icon: 'https://cdn-icons-png.flaticon.com/128/857/857451.png' },
      { id: 4, name: '医疗', icon: 'https://cdn-icons-png.flaticon.com/128/2966/2966327.png' },
      { id: 5, name: '保健', icon: 'https://cdn-icons-png.flaticon.com/128/2966/2966488.png' },
      { id: 6, name: '娱乐', icon: 'https://cdn-icons-png.flaticon.com/128/3048/3048398.png' },
      { id: 7, name: '电子', icon: 'https://cdn-icons-png.flaticon.com/128/685/685655.png' },
      { id: 8, name: '家庭', icon: 'https://cdn-icons-png.flaticon.com/128/619/619153.png' },
    ],
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
        userAccount: loginInfo.userAccount
      });
    }

    // 检查是否有从分类页传来的筛选参数
    if (options && (options.fenlei || options.fenlei2)) {
      this.setData({
        currentCategory: options.fenlei2 || options.fenlei || '全部'
      });

      // 如果有具体分类，则在获取商品时增加筛选条件
      this.fetchProducts(options.fenlei, options.fenlei2);
    } else {
      this.fetchProducts();
    }
    this.fetchHotProducts();
  },

  fetchHotProducts: function() {
    // 从订单表统计销量最高的前5个产品，并关联商品表获取详细信息
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
          // 将数据库字段映射到 UI 字段
          const products = data.map(item => {
            const originalPrice = parseFloat(item.yuanjia) || 0;
            const zhekou = parseFloat(item.zhekou);
            // 判断是否需要计算折后价: zhekou 存在且不等于 1
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
      // 修改筛选逻辑：匹配大类 (fenlei) 或 小类 (fenlei2)
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

  onGetAddress: function() {
    wx.getLocation({
      type: 'geolocation',
      success: (res) => {
        wx.showActionSheet({
          itemList: ['自动获取当前位置', '手动选择地址'],
          success: (sheetRes) => {
            const index = sheetRes.tapIndex;
            if (index === 0) {
              this.autoGetLocation(res);
            } else {
              this.manualChooseLocation();
            }
          }
        });
      },
      fail: () => {
        this.manualChooseLocation();
      }
    });
  },

  autoGetLocation: function(location) {
    wx.showLoading({ title: '解析地址中...' });
    wx.reverseGeocoding({
      latitude: location.latitude,
      longitude: location.longitude,
      success: (res) => {
      	wx.hideLoading();
      	wx.showToast({
      	  title: '当前位置：' + res.address,
      	  icon: 'none',
      	  duration: 2000
      	});
      	console.log('Auto-located address:', res.address);
      },
      fail: () => {
      	wx.hideLoading();
      	wx.showToast({ title: '地址解析失败', icon: 'none' });
      }
    });
  },

  manualChooseLocation: function() {
    wx.chooseLocation({
      success: (res) => {
        wx.showToast({
          title: '地址获取成功',
          icon: 'success'
        });
        console.log('Manually selected address:', res.address);
      }
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
        console.error('【登录调试】调用云函数失败：', err);
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

  goToPayTest: function() {
    wx.navigateTo({
      url: '/pages/pay/pay'
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
    // 阻止事件冒泡，防止触发父元素的 goToDetail
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

    // 增加：账号和密码一致性校验
    if (regAccount === regPassword) {
      wx.showModal({
        title: '注册失败',
        content: '账号和密码不能相同，请重新设置',
        showCancel: false
      });
      return;
    }

    wx.showLoading({ title: '校验中...' });

    // 1. 检查账号+密码拼接后是否已存在（确保组合唯一性）
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

        // 2. 执行注册插入
        wx.showLoading({ title: '注册中...' });
        wx.cloud.callFunction({
          name: 'shangcheng',
          data: {
            query: "INSERT INTO login (yonghuming, zhanghao, mima, shenfen) VALUES ('" + regName + "', '" + regAccount + "', '" + regPassword + "', '用户')"
          },
          success: regRes => {
            wx.hideLoading();

            // 3. 注册成功后直接执行登录逻辑
            this.setData({
              userName: regName,
              userAccount: regAccount,
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
  }
})
