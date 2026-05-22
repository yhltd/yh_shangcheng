App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'yhltd-hsxl2', // 使用 YH_jinxiaocun 案例中经过验证的有效环境ID
        traceUser: true,
      });
    }
    console.log('商城小程序启动成功');
  },
  globalData: {
    userInfo: null,
    cartList: []
  }
})
