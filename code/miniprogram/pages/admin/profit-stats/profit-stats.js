Page({
  data: {
    totalRevenue: '0.00',
    totalOrders: 0,
    hotProducts: [],
    recentOrders: [],
    orderList: []
  },

  onLoad: function() {
    const user = wx.getStorageSync('user') || {};
    const storeName = user.dianpu;

    console.log('Current Store Name from cache:', storeName);

    if (!storeName) {
      wx.showToast({
        title: '未获取到店铺信息',
        icon: 'none'
      });
      return;
    }

    this.fetchStats(storeName);
    this.fetchHotProducts(storeName);
    this.fetchRecentOrders(storeName);
  },

  fetchStats: function(storeName) {
    wx.showLoading({ title: '加载统计中...' });
    var query = "SELECT " +
      "COUNT(*) as total_count, " +
      "SUM(CAST(CASE WHEN xshj IS NULL OR xshj = '' THEN '0' ELSE xshj END AS DECIMAL(18,2))) as total_amount " +
      "FROM dingdan " +
      "WHERE sjmc = '" + storeName + "' AND ddzt = '下单'";

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: query
      },
      success: (res) => {
        const result = res.result;
        let data = null;
        if (Array.isArray(result)) {
          data = result;
        } else if (result && result.recordset) {
          data = result.recordset;
        } else if (result && result.recordsets && result.recordsets[0]) {
          data = result.recordsets[0];
        }

        if (data && data.length > 0) {
          const row = data[0];
          const amount = parseFloat(row.total_amount || 0);
          const count = parseInt(row.total_count || 0);

          this.setData({
            totalRevenue: amount.toFixed(2),
            totalOrders: count
          });
        }
      },
      fail: (err) => {
        console.error('Fetch stats failed', err);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  fetchHotProducts: function(storeName) {
    var query = "SELECT TOP 5 cpmc as pname, COUNT(*) as count " +
               "FROM dingdan " +
               "WHERE sjmc = '" + storeName + "' AND ddzt = '下单' " +
               "GROUP BY cpmc " +
               "ORDER BY count DESC";

    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: query
      },
      success: (res) => {
        const result = res.result;
        const data = (result && result.recordset) || (result && result.recordsets && result.recordsets[0]);
        if (data && data.length > 0) {
          const maxCount = Math.max(...data.map(item => item.count));
          const hotProducts = data.map(item => ({
            pname: item.pname,
            count: item.count,
            barStyle: `width: ${((item.count / maxCount) * 100).toFixed(0)}%`
          }));
          this.setData({ hotProducts });
        }
      },
      fail: (err) => {
        console.error('Fetch hot products failed', err);
      }
    });
  },

  fetchRecentOrders: function(storeName) {
    wx.cloud.callFunction({
      name: 'shangcheng',
      data: {
        query: `SELECT TOP 5 ddh, xshj as ze FROM dingdan WHERE sjmc = '${storeName}' AND ddzt = '下单' ORDER BY id DESC`
      },
      success: (res) => {
        const result = res.result;
        const data = (result && result.recordset) || (result && result.recordsets && result.recordsets[0]);
        if (data && data.length > 0) {
          const recentOrders = data.map(item => ({
            id: item.ddh,
            amount: parseFloat(item.ze || 0).toFixed(2)
          }));
          this.setData({ recentOrders });
        }
      },
      fail: (err) => {
        console.error('Fetch recent orders failed', err);
      }
    });
  }
})