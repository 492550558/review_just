/**
 * @file storage.js
 * @description 数据存储工具类，负责复盘记录的本地持久化存储、读取、更新和删除
 * @created 2026-01-18
 * @lastModified 2026-01-18
 * @author Trae AI
 * @version 1.0.0
 * @requires wx.getStorageSync
 * @requires wx.setStorageSync
 */
const KEY = 'review_logs'

/**
 * 获取所有复盘记录
 * @returns {Array} 复盘记录数组，若无数据或出错则返回空数组
 */
const getReviews = () => {
  try {
    return wx.getStorageSync(KEY) || []
  } catch (e) {
    console.error('Get storage failed', e)
    return []
  }
}

/**
 * 新增复盘记录
 * @param {Object} review - 复盘数据对象 (包含 title, content, priority 等)
 * @returns {Object} 新创建的包含 ID 和时间戳的完整记录对象
 */
const addReview = (review) => {
  const reviews = getReviews()
  const newReview = {
    ...review,
    id: Date.now().toString(), // 使用当前时间戳作为唯一ID
    createTime: review.createTime || Date.now() // 优先使用传入的时间，否则使用当前时间
  }
  reviews.push(newReview) // 新项目添加到列表底部
  wx.setStorageSync(KEY, reviews)
  return newReview
}

/**
 * 更新复盘记录
 * @param {string} id - 记录ID
 * @param {Object} data - 需要更新的数据字段
 * @returns {boolean} 更新成功返回 true，失败返回 false
 */
const updateReview = (id, data) => {
  // 数据库层校验：标题长度
  if (data.title && data.title.length > 14) {
    throw new Error('复盘名称不得超过14个汉字')
  }

  const reviews = getReviews()
  const index = reviews.findIndex(r => r.id === id)
  if (index > -1) {
    reviews[index] = { ...reviews[index], ...data }
    wx.setStorageSync(KEY, reviews)
    return true
  }
  return false
}

/**
 * 删除复盘记录
 * @param {string} id - 要删除的记录ID
 * @returns {boolean} 删除操作始终返回 true
 */
const deleteReview = (id) => {
  const reviews = getReviews()
  const newReviews = reviews.filter(r => r.id !== id)
  wx.setStorageSync(KEY, newReviews)
  return true
}

const updateReviewsOrder = (newReviews) => {
  wx.setStorageSync(KEY, newReviews)
  return true
}

module.exports = {
  getReviews,
  addReview,
  updateReview,
  deleteReview,
  updateReviewsOrder
}