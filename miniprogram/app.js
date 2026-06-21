// app.js
App({
  onLaunch: function () {
    // 初始化云开发环境，传入云环境 ID 以连接到指定的云开发实例
    if (wx.cloud) {
      wx.cloud.init({
        env: 'YOUR_CLOUD_ENV_ID', // 云环境 ID，请替换为你自己的环境 ID
        traceUser: true, // 是否在将用户访问记录加入用户数据库（用于数据分析）
      });
    }
  },
  globalData: {
    // 云环境 ID，供其他模块获取
    env: 'YOUR_CLOUD_ENV_ID' // 云环境 ID，请替换为你自己的环境 ID
  }
});
