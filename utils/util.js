/**
 * @file util.js
 * @description 通用工具函数库，提供日期格式化等基础功能
 * @created 2026-01-18
 * @lastModified 2026-01-18
 * @author Trae AI
 * @version 1.0.0
 */

/**
 * 格式化日期对象为字符串
 * @param {Date} date - JavaScript Date 对象
 * @returns {string} 格式化后的日期字符串 (YYYY/MM/DD HH:mm:ss)
 */
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

/**
 * 数字补零格式化
 * 用于确保日期和时间部分始终为两位数
 * @param {number|string} n - 需要格式化的数字
 * @returns {string} 补零后的字符串 (例如: 5 -> "05", 12 -> "12")
 */
const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

module.exports = {
  formatTime
}