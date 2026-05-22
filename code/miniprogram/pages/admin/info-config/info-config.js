Page({
  data: {
    config: {
      dianpu: '',
      peisongfei: '',
      dianhua: ''
    },
    payConfig: {
      Type: 'wechat_pay',
      AppId: '',
      Mchid: '',
      ApiKey: ''
    }
  },

  onLoad: function() {
    this.fetchConfig();
    this.fetchPayConfig();
  },

  fetchConfig: function() {
    wx.showLoading({ title: '加载中...', mask: true });

    const user = wx.getStorageSync('userLoginInfo') || wx.getStorageSync('user') || {};
    const account = user.userAccount;

    if (!account) {
      wx.hideLoading();
      wx.showToast({ title: '用户登录信息缺失', icon: 'none' });
      return;
    }

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT dianpu, peisongfei, dianhua FROM login WHERE zhanghao = '${account}'`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0) {
          this.setData({
            config: data[0]
          });
        } else {
          wx.showToast({ title: '未查询到配置信息', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('Fetch config failed', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  fetchPayConfig: function(type) {
    const user = wx.getStorageSync('userLoginInfo') || wx.getStorageSync('user') || {};
    const account = user.userAccount;
    const targetType = type || this.data.payConfig.Type;

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT * FROM MerchantPaymentConfig WHERE MerchantId = '${this.escape(account)}' AND PaymentType = '${this.escape(targetType)}'`
      },
      success: (res) => {
        const data = res.result && res.result.recordsets && res.result.recordsets[0];
        if (data && data.length > 0) {
          this.setData({ payConfig: data[0] });
        } else {
          // 如果该类型没配置过，则初始化为空值，但保留 Type
          this.setData({
            payConfig: {
              Type: targetType,
              AppId: '',
              Mchid: '',
              ApiKey: ''
            }
          });
        }
      },
      fail: (err) => {
        console.error('Fetch pay config failed', err);
      }
    });
  },

  onInputChange: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`config.${field}`]: e.detail.value
    });
  },

  onPayTypeChange: function(e) {
    const type = e.detail.value;
    this.setData({ 'payConfig.Type': type });
    // 切换类型时，立即加载该类型的配置
    this.fetchPayConfig(type);
  },


  onPayInputChange: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`payConfig.${field}`]: e.detail.value
    });
  },

  doSave: function() {
    const { config, payConfig } = this.data;
    const user = wx.getStorageSync('userLoginInfo') || wx.getStorageSync('user') || {};
    const account = user.userAccount;

    if (!account) {
      wx.showToast({ title: '无法确定用户账号', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...', mask: true });

    // 1. 保存基本信息 - 沿用写 SQL 形式
    const sql = `UPDATE login SET
                 dianpu = '${this.escape(config.dianpu)}',
                 peisongfei = ${this.num(config.peisongfei)},
                 dianhua = '${this.escape(config.dianhua)}'
                 WHERE zhanghao = '${this.escape(account)}'`;


    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: sql
      },
      success: (res) => {
        wx.showToast({ title: '基本配置已更新', icon: 'success' });
        // 更新缓存
        const loginInfo = wx.getStorageSync('userLoginInfo') || {};
        loginInfo.dianpu = config.dianpu;
        wx.setStorageSync('userLoginInfo', loginInfo);
        const userCache = wx.getStorageSync('user') || {};
        userCache.dianpu = config.dianpu;
        wx.setStorageSync('user', userCache);

        // 2. 保存支付配置 - 此处由于是新表且逻辑复杂，建议仍使用 action 保证正确性
        this.savePaymentConfig(account, payConfig);
      },
      fail: (err) => {
        console.error('Save failed', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  savePaymentConfig: function(account, payConfig) {
    const deleteSql = `DELETE FROM MerchantPaymentConfig WHERE MerchantId = '${this.escape(account)}' AND PaymentType = '${this.escape(payConfig.Type)}'`;
    const insertSql = `INSERT INTO MerchantPaymentConfig (MerchantId, PaymentType, AppId, Mchid, ApiKey)
                       VALUES ('${this.escape(account)}', '${this.escape(payConfig.Type)}', '${this.escape(payConfig.AppId)}', '${this.escape(payConfig.Mchid)}', '${this.escape(payConfig.ApiKey)}')`;

    wx.showLoading({ title: '保存支付配置中...', mask: true });

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: { query: deleteSql },
      success: (res) => {
        console.log("删除",res)
        wx.cloud.callFunction({
          name: 'shangcheng',
          data: { query: insertSql },
          success: (res) => {
            console.log("添加",res)
            wx.showToast({ title: '全部配置已更新', icon: 'success' });
          },
          fail: (err) => {
            console.error('Insert pay config failed', err);
            wx.showToast({ title: '支付配置保存失败', icon: 'none' });
          },
          complete: () => {
            wx.hideLoading();
          }
        });
      },
      fail: (err) => {
        console.error('Delete pay config failed', err);
        wx.showToast({ title: '支付配置更新失败', icon: 'none' });
        wx.hideLoading();
      }
    });
  },

  escape: function(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "''");
  },

  num: function(val) {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
})

