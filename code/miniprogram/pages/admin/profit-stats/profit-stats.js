Page({
  data: {
    totalRevenue: '0.00',
    totalOrders: 0,
    returnOrders: 0,    // 退货量
    netRevenue: '0.00',  // 净营收
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

    // 修改 SQL：使用 CASE WHEN 分别统计下单金额和退货金额
    var query = "SELECT " +
      "COUNT(CASE WHEN ddzt IN ('下单', '申请退货') THEN 1 END) as total_count, " +
      "SUM(CAST(CASE WHEN ddzt IN ('下单', '申请退货') AND (xshj IS NOT NULL AND xshj <> '') THEN xshj ELSE '0' END AS DECIMAL(18,2))) as total_total_amount, " +
      "COUNT(CASE WHEN ddzt = '退货' THEN 1 END) as return_count, " +
      "SUM(CAST(CASE WHEN ddzt = '退货' AND (xshj IS NOT NULL AND xshj <> '') THEN xshj ELSE '0' END AS DECIMAL(18,2))) as return_amount " +
      "FROM dingdan " +
      "WHERE sjmc = '" + storeName + "'";

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
          const revenue = parseFloat(row.total_total_amount || 0);
          const orders = parseInt(row.total_count || 0);
          const returns = parseInt(row.return_count || 0);
          const returnAmt = parseFloat(row.return_amount || 0);

          this.setData({
            totalRevenue: revenue.toFixed(2),
            totalOrders: orders,
            returnOrders: returns,                     // 体现退货量
            netRevenue: (revenue - returnAmt).toFixed(2) // 体现净营收
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
