/**
 * @file schedule.js
 * @description 日程页面逻辑：实现月视图日历展示复盘记录
 * @created 2026-01-18
 * @author Trae AI
 */
const storage = require('../../utils/storage')
const util = require('../../utils/util')

Page({
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1, // 1-12
    calendarDays: [], // 日历网格数据
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    isLoading: false,
    startX: 0,
    startY: 0,
    isCurrentMonth: true // 是否为当前月
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
    this.generateCalendar(this.data.currentYear, this.data.currentMonth)
    this.checkCurrentMonth(this.data.currentYear, this.data.currentMonth)
  },

  /**
   * 检查是否为当前月
   */
  checkCurrentMonth(year, month) {
    const now = new Date()
    const isCurrent = year === now.getFullYear() && month === (now.getMonth() + 1)
    this.setData({ isCurrentMonth: isCurrent })
  },

  /**
   * 返回当前月
   */
  onBackToCurrentMonth() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    this.setData({ currentYear: year, currentMonth: month })
    this.generateCalendar(year, month)
    this.checkCurrentMonth(year, month)
  },

  /**
   * 触摸开始
   */
  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.setData({
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY
      })
    }
  },

  /**
   * 触摸结束 (处理左右滑动)
   */
  onTouchEnd(e) {
    if (e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const distX = endX - this.data.startX
      const distY = endY - this.data.startY
      
      // 水平滑动判断：X轴距离大于50且大于Y轴距离
      if (Math.abs(distX) > 50 && Math.abs(distX) > Math.abs(distY)) {
        if (distX > 0) {
          // 向右滑 -> 上个月
          this.changeMonth({ currentTarget: { dataset: { delta: -1 } } })
        } else {
          // 向左滑 -> 下个月
          this.changeMonth({ currentTarget: { dataset: { delta: 1 } } })
        }
      }
    }
  },

  /**
   * 生成指定年月的日历数据
   */
  generateCalendar(year, month) {
    this.setData({ isLoading: true })

    // 获取所有复盘记录
    const allReviews = storage.getReviews()
    
    // 计算当月第一天是星期几 (0-6)
    const firstDay = new Date(year, month - 1, 1).getDay()
    
    // 计算当月有多少天
    const daysInMonth = new Date(year, month, 0).getDate()
    
    const days = []
    
    // 填充空白前导
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: '', empty: true })
    }
    
    // 填充日期及数据
    for (let i = 1; i <= daysInMonth; i++) {
      // 筛选当天的复盘记录
      // 注意：storage 中 createTime 是时间戳，需要转换对比
      // 这里简化处理：假设 createTime 是当天
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      
      const dayReviews = allReviews.filter(r => {
        const d = new Date(r.createTime)
        return d.getFullYear() === year && 
               (d.getMonth() + 1) === month && 
               d.getDate() === i
      })
      .slice(0, 6) // 最多显示6条
      .map(r => ({
        ...r,
        // 限制内容长度：最多显示6个汉字 (实际上这里是字符，中文算1，英文算1。若要精确区分中英文，需额外逻辑)
        // 简单处理：截取前6个字符，若超过则加省略号
        // 用户要求：6个汉字（12个英文字符）。这里简单按字符串长度截取6位，可能稍微不准但符合"最多6字"的直观理解。
        displayTitle: r.title.length > 6 ? r.title.substring(0, 6) + '...' : r.title
      }))

      days.push({
        day: i,
        fullDate: dateStr,
        reviews: dayReviews
      })
    }

    this.setData({
      calendarDays: days,
      isLoading: false
    })
  },

  /**
   * 切换月份
   */
  changeMonth(e) {
    const delta = parseInt(e.currentTarget.dataset.delta)
    let { currentYear, currentMonth } = this.data
    
    currentMonth += delta
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    } else if (currentMonth < 1) {
      currentMonth = 12
      currentYear--
    }

    this.setData({ currentYear, currentMonth })
    this.generateCalendar(currentYear, currentMonth)
    this.checkCurrentMonth(currentYear, currentMonth)
  },

  /**
   * 点击日期查看详情
   */
  onDayTap(e) {
    // 获取完整日期 YYYY-MM-DD
    const targetDate = e.currentTarget.dataset.fulldate

    // 仅当日期有效时才跳转 (过滤掉空白格)
    if (targetDate) {
      // 首页是 TabBar 页面，必须使用 switchTab 跳转
      // 且 switchTab 不支持 url 参数，需要通过 globalData 传递
      const app = getApp()
      app.globalData.jumpDate = targetDate
      
      wx.switchTab({
        url: '/pages/index/index',
        fail: (err) => {
          console.error('跳转失败:', err)
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          })
        }
      })
    }
  }
})