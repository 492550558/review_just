const storage = require('../../utils/storage')
const util = require('../../utils/util')

/**
 * @file index.js
 * @description 主页逻辑，负责展示复盘列表、处理手势交互（左滑删除）及页面跳转
 * @created 2026-01-18
 * @lastModified 2026-01-18
 * @author Trae AI
 * @version 1.0.0
 */
Page({
  /**
   * 页面初始数据
   */
  data: {
    reviews: [],    // 复盘记录列表
    startX: 0,      // 触摸起始 X 坐标
    startY: 0,      // 触摸起始 Y 坐标
    
    // 拖拽相关状态
    draggingIndex: -1, // 当前正在拖拽的索引，-1表示未拖拽
    dragStartY: 0,     // 拖拽起始的Y坐标
    itemHeight: 0,     // 每个列表项的高度（包含margin），需要动态获取或固定
    dragOffset: 0,      // 拖拽时的垂直位移

    // 抽屉及表单状态
    isDrawerOpen: false,
    editingReviewId: null,
    title: '',
    content: '',
    priority: '',
    status: 'completed',
    priorities: [
      { label: '早', value: 'high', color: '#4CAF50' },
      { label: '午', value: 'medium', color: '#4CAF50' },
      { label: '夜', value: 'low', color: '#4CAF50' }
    ],
    statuses: [
      { label: '完成', value: 'completed', color: '#4CAF50' },
      { label: '失败', value: 'failed', color: '#4CAF50' }
    ]
  },

  onLoad(options) {
    // 优先使用路由参数中的日期，否则使用今天
    let dateStr = options.date
    if (!dateStr) {
      const today = new Date()
      dateStr = util.formatTime(today).substring(0, 10).replace(/\//g, '-')
    }
    this.setData({ currentDate: dateStr })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }

    // 检查是否有跨页面传递的日期参数 (来自日程页跳转)
    const app = getApp()
    if (app.globalData && app.globalData.jumpDate) {
      this.setData({ currentDate: app.globalData.jumpDate })
      // 消费后清除，防止重复触发
      app.globalData.jumpDate = null
    } 
    // 如果没有跳转参数且没有当前日期，则补全为今天
    else if (!this.data.currentDate) {
       const today = new Date()
       const dateStr = util.formatTime(today).substring(0, 10).replace(/\//g, '-')
       this.setData({ currentDate: dateStr })
    }

    // 获取系统信息适配自定义导航栏

    this.loadReviews()
  },

  loadReviews() {
    const reviews = storage.getReviews()
    const { currentDate } = this.data
    
    // 更新 isToday 状态
    const today = new Date()
    const todayStr = util.formatTime(today).substring(0, 10).replace(/\//g, '-')
    if (this.data.isToday !== (currentDate === todayStr)) {
      this.setData({ isToday: currentDate === todayStr })
    }
    
    // 根据 currentDate 筛选
    // 假设 currentDate 格式为 YYYY-MM-DD
    const filteredReviews = reviews.filter(r => {
      const d = new Date(r.createTime)
      const rDate = util.formatTime(d).substring(0, 10).replace(/\//g, '-')
      return rDate === currentDate
    })

    this.setData({
      reviews: filteredReviews.map(r => ({
        ...r,
        offsetX: 0,
        translateY: 0, // 垂直位移，用于重排动画
        transition: 'none',
        isDeleting: false
      }))
    })
  },

  onTouchStart(e) {
    if (e.touches.length === 1) {
      const { clientX, clientY } = e.touches[0]
      this.setData({
        startX: clientX,
        startY: clientY,
        dragStartY: clientY
      })
      
      // 记录长按定时器，用于触发拖拽
      this.longPressTimer = setTimeout(() => {
        this.startDrag(e)
      }, 500)
    }
  },

  onTouchMove(e) {
    if (e.touches.length === 1) {
      const { clientX, clientY } = e.touches[0]
      const distX = this.data.startX - clientX
      const distY = this.data.startY - clientY

      // 如果已经处于拖拽状态
      if (this.data.draggingIndex !== -1) {
        this.handleDragMove(clientY)
        return
      }

      // 正常的左滑逻辑
      if (Math.abs(distY) > Math.abs(distX)) {
        // 如果垂直移动超过阈值，取消长按计时器，防止滚动时误触发长按
        if (Math.abs(distY) > 10) {
          clearTimeout(this.longPressTimer)
        }
        return
      }

      // 水平滑动逻辑... (原有代码)
      clearTimeout(this.longPressTimer) // 水平滑动时取消长按

      let offsetX = 0
      if (distX > 0) {
        offsetX = -Math.min(distX, 100) 
      }
      const index = e.currentTarget.dataset.index
      const currentItem = this.data.reviews[index]
      if (currentItem.offsetX !== offsetX) {
        const key = `reviews[${index}].offsetX`
        const transitionKey = `reviews[${index}].transition`
        this.setData({
          [key]: offsetX,
          [transitionKey]: 'none'
        })
      }
    }
  },

  onTouchEnd(e) {
    clearTimeout(this.longPressTimer) // 清除长按计时器

    if (this.data.draggingIndex !== -1) {
      this.handleDragEnd()
      return
    }

    // 原有左滑结束逻辑...
    if (e.changedTouches.length === 1) {
      const index = e.currentTarget.dataset.index
      const endX = e.changedTouches[0].clientX
      const distX = this.data.startX - endX
      const threshold = 60

      let finalOffsetX = 0
      if (distX > threshold) {
        finalOffsetX = -80
      }

      const updates = {}
      this.data.reviews.forEach((r, i) => {
        if (i !== index && r.offsetX !== 0) {
          updates[`reviews[${i}].offsetX`] = 0
          updates[`reviews[${i}].transition`] = 'transform 0.3s ease'
        }
      })

      updates[`reviews[${index}].offsetX`] = finalOffsetX
      updates[`reviews[${index}].transition`] = 'transform 0.3s ease'
      
      this.setData(updates)
    }
  },

  // 开始拖拽
  startDrag(e) {
    const index = e.currentTarget.dataset.index
    // 获取当前项的高度，用于计算
    const query = wx.createSelectorQuery()
    query.selectAll('.review-item-wrapper').boundingClientRect(rects => {
      if (rects && rects[index]) {
        this.itemHeight = rects[index].height
        this.setData({
          draggingIndex: index
        })
        wx.vibrateShort() // 震动反馈
      }
    }).exec()
  },

  // 处理拖拽移动
  handleDragMove(currentY) {
    const { draggingIndex, dragStartY, reviews } = this.data
    const moveY = currentY - dragStartY
    const itemHeight = this.itemHeight // 假设高度一致或近似

    // 更新当前拖拽项的位置
    const key = `reviews[${draggingIndex}].translateY`
    // 我们需要实时更新视图，但不需要频繁 setData 整个数组
    // 这里只更新 transform 可能会有性能瓶颈，最好结合 wxs，但 JS 也能做简单版
    
    // 计算当前项应该所在的索引
    // moveY / itemHeight = 跨越了几个格子
    const offsetCount = Math.round(moveY / itemHeight)
    let targetIndex = draggingIndex + offsetCount
    
    // 边界限制
    targetIndex = Math.max(0, Math.min(targetIndex, reviews.length - 1))

    const updates = {}
    updates[key] = moveY

    // 其他项的移位逻辑
    reviews.forEach((item, idx) => {
      if (idx === draggingIndex) return
      
      let translateY = 0
      if (draggingIndex < targetIndex) {
        // 向下拖动：中间的项向上移
        if (idx > draggingIndex && idx <= targetIndex) {
          translateY = -itemHeight
        }
      } else if (draggingIndex > targetIndex) {
        // 向上拖动：中间的项向下移
        if (idx >= targetIndex && idx < draggingIndex) {
          translateY = itemHeight
        }
      }
      
      if (item.translateY !== translateY) {
        updates[`reviews[${idx}].translateY`] = translateY
      }
    })

    this.setData(updates)
    this.targetIndex = targetIndex // 记录目标位置，用于结束时重排
  },

  // 拖拽结束
  handleDragEnd() {
    const { draggingIndex, reviews } = this.data
    let targetIndex = this.targetIndex
    
    if (targetIndex === undefined || targetIndex === draggingIndex) {
      // 没动或回到原位，复位
      const updates = {}
      reviews.forEach((r, i) => {
        updates[`reviews[${i}].translateY`] = 0
      })
      this.setData({
        draggingIndex: -1,
        ...updates
      })
      this.targetIndex = undefined
      return
    }

    // 重排数据
    const newReviews = [...reviews]
    const [movedItem] = newReviews.splice(draggingIndex, 1)
    newReviews.splice(targetIndex, 0, movedItem)

    // 重置所有 UI 状态
    const resetReviews = newReviews.map(r => ({
      ...r,
      translateY: 0,
      transition: 'none',
      offsetX: 0 // 防止带入左滑状态
    }))

    this.setData({
      reviews: resetReviews,
      draggingIndex: -1
    })
    
    // 保存到本地存储
    storage.updateReviewsOrder(resetReviews)
    
    this.targetIndex = undefined
  },

  /**
   * 日期切换事件
   */
  onDateChange(e) {
    const date = e.detail.date
    const { currentDate } = this.data

    // 如果选中的日期与当前页面日期不同，则进行跳转
    this.setData({ currentDate: date })
    this.loadReviews()
  },

  /**
   * 返回今日
   */
  onBackToday() {
    const calendar = this.selectComponent('#weekCalendar')
    const today = new Date()
    const dateStr = util.formatTime(today).substring(0, 10).replace(/\//g, '-')

    if (calendar && calendar.setToday) {
      calendar.setToday()
    }
    
    // 无论组件是否存在，主页数据都需要更新回今天
    this.setData({ currentDate: dateStr })
    this.loadReviews()
  },
  onDeleteTap(e) {
    const id = e.currentTarget.dataset.id
    const index = this.data.reviews.findIndex(r => r.id === id)
    if (index === -1) return

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      confirmColor: '#ff4d4f', // 确认按钮使用红色警示
      success: (res) => {
        if (res.confirm) {
          storage.deleteReview(id)
          // 1. 启动高度收缩和淡出动画
          this.setData({
            [`reviews[${index}].isDeleting`]: true
          })

          // 2. 等待动画完成后 (300ms) 再从数据源移除
          setTimeout(() => {
            // 从当前视图列表中移除该项，避免整页重新加载导致闪烁
            const newReviews = this.data.reviews.filter(r => r.id !== id)
            this.setData({ reviews: newReviews })
          }, 300) 
        } else {
          // 取消删除，收起删除按钮
          this.setData({
            [`reviews[${index}].offsetX`]: 0
          })
        }
      }
    })
  },

  /**
   * 点击复盘条目跳转详情 -> 改为打开编辑抽屉
   */
  onReviewTap(e) {
    const id = e.currentTarget.dataset.id
    this.openDrawer(id)
  },

  /**
   * 点击悬浮按钮 -> 打开新建抽屉
   */
  onAddTap() {
    this.openDrawer(null)
  },

  /**
   * 打开抽屉
   * @param {string|null} id - 编辑模式传入ID，新建模式传入null
   */
  openDrawer(id) {
    if (id) {
      // 编辑模式：回填数据
      const review = this.data.reviews.find(r => r.id === id)
      if (review) {
        this.setData({
          isDrawerOpen: true,
          editingReviewId: id,
          title: review.title,
          content: review.content,
          priority: review.priority || '',
          status: review.status || 'completed'
        })
      }
    } else {
      // 新建模式：重置表单
      this.setData({
        isDrawerOpen: true,
        editingReviewId: null,
        title: '',
        content: '',
        priority: '',
        status: 'completed'
      })
    }
  },

  /**
   * 关闭抽屉
   */
  closeDrawer() {
    this.setData({
      isDrawerOpen: false
    })
  },

  /* --- 表单处理逻辑 --- */

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onClearTitle() {
    this.setData({ title: '' })
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onPriorityTap(e) {
    const value = e.currentTarget.dataset.value
    this.setData({
      priority: value === this.data.priority ? '' : value
    })
  },

  onStatusTap(e) {
    this.setData({ status: e.currentTarget.dataset.value })
  },

  /**
   * 保存数据
   */
  onSave() {
    const { editingReviewId, title, content, priority, status } = this.data
    
    // 校验
    if (!title.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    if (title.length > 14) {
      wx.showToast({ title: '名称不得超过14个汉字', icon: 'none' })
      return
    }

    const data = { title, content, priority, status }

    if (editingReviewId) {
      // 更新
      storage.updateReview(editingReviewId, data)
    } else {
      // 新增 - 确保使用当前选中的日期
      // 构造时间戳：使用 currentDate 的日期部分，加上当前时间的时间部分（保持添加顺序）
      // currentDate 格式 "YYYY-MM-DD"
      let timestamp = Date.now()
      if (this.data.currentDate) {
        const now = new Date()
        const [year, month, day] = this.data.currentDate.split('-').map(Number)
        // 注意：Month 从 0 开始
        const d = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds())
        timestamp = d.getTime()
      }
      
      storage.addReview({
        ...data,
        createTime: timestamp
      })
    }

    // 刷新列表并关闭抽屉
    this.loadReviews()
    this.closeDrawer()
    wx.showToast({ title: '保存成功', icon: 'success' })
  }
})