/**
 * @file app.js
 * @description 小程序入口文件，处理应用生命周期回调和全局数据初始化
 * @created 2026-01-18
 * @lastModified 2026-01-18
 * @author Trae AI
 * @version 1.0.0
 */
App({
  /**
   * 小程序初始化完成时触发
   * @description 检查本地存储初始化状态，确保核心数据结构存在
   */
  onLaunch() {
    // 初始化本地存储结构
    // 检查是否存在 review_logs 键，若不存在则初始化为空数组，避免后续读取报错
    const logs = wx.getStorageSync('review_logs') || []
    if (!logs) {
      wx.setStorageSync('review_logs', [])
    }
  },
  
  /**
   * 全局共享数据
   */
  globalData: {
    userInfo: null
  }
})