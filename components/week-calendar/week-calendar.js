/**
 * @file week-calendar.js
 * @description 周视图日历组件，支持曲线展示复盘数据
 */
const storage = require('../../utils/storage')
const util = require('../../utils/util')

Component({
  properties: {
    // 外部传入的刷新触发器
    refreshTrigger: {
      type: Number,
      observer: 'initData'
    },
    // 初始选中日期
    date: {
      type: String,
      value: '',
      observer: 'onDatePropChange'
    }
  },

  data: {
    weekDates: [], // 当前周的日期数据
    selectedDate: '', // 当前选中的日期 YYYY-MM-DD
    currentWeekStart: null, // 当前周起始日期对象
    
    // 触摸相关
    startX: 0,
    startY: 0
  },

  lifetimes: {
    attached() {
      // 初始化 Canvas Context 缓存
      this.canvasNode = null
      this.ctx = null

      // 如果外部传入了 date，则使用外部 date，否则默认今天
      let dateStr = this.data.date
      if (!dateStr) {
        const today = new Date()
        dateStr = util.formatTime(today).substring(0, 10).replace(/\//g, '-')
      }
      
      this.setData({
        selectedDate: dateStr,
        currentWeekStart: this.getWeekStart(dateStr)
      })
      
      this.initData()
    }
  },

  methods: {
    /**
     * 监听 date 属性变化
     */
    onDatePropChange(newDate) {
      if (!newDate) return
      
      // 如果新日期与当前选中日期不同，则更新
      if (newDate !== this.data.selectedDate) {
        this.setData({
          selectedDate: newDate,
          currentWeekStart: this.getWeekStart(newDate)
        })
        this.initData()
      }
    },

    /**
     * 设置回今天
     */
    setToday() {
      const today = new Date()
      const dateStr = util.formatTime(today).substring(0, 10).replace(/\//g, '-')
      
      this.setData({
        selectedDate: dateStr,
        currentWeekStart: this.getWeekStart(today)
      })
      this.initData()
      this.triggerEvent('datechange', { date: dateStr })
    },

    /**
     * 获取指定日期所在周的周一
     */
    getWeekStart(date) {
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
      return new Date(d.setDate(diff))
    },

    /**
     * 初始化数据：计算日期列表并绘制
     */
    initData() {
      const start = new Date(this.data.currentWeekStart)
      const weekDates = []
      const reviews = storage.getReviews()
      const dataPoints = [] // 用于 Canvas 绘制 [0-10] 范围的数值

      const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const fullDate = `${year}-${month}-${day}`
        
        // 统计当天的复盘数据量
        const dayReviews = reviews.filter(r => {
          const rd = new Date(r.createTime)
          return rd.getFullYear() === year && 
                 (rd.getMonth() + 1) === parseInt(month) && 
                 rd.getDate() === parseInt(day)
        })

        // 简单算法：根据复盘数量计算活跃度，最大为 5
        const score = Math.min(dayReviews.length, 5)
        dataPoints.push(score)

        weekDates.push({
          fullDate,
          dateNum: day,
          weekday: weekMap[d.getDay()],
          score
        })
      }

      // 仅当数据真正变化时才更新视图，但这里因为涉及到 Canvas 重绘，简化为直接更新
      // 为了性能，数据更新和 Canvas 绘制分离
      this.setData({ weekDates }, () => {
        // 在 setData 回调中绘制，确保节点就绪
        // 使用 requestAnimationFrame 避免阻塞
        this.drawCurve(dataPoints)
      })
    },

    /**
     * 绘制曲线
     */
    drawCurve(dataPoints) {
      // 如果已有缓存的 Context，直接使用
      if (this.canvasNode && this.ctx) {
        this.renderCanvas(this.canvasNode, this.ctx, dataPoints)
        return
      }

      const query = this.createSelectorQuery()
      query.select('#curveCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')

          const dpr = wx.getSystemInfoSync().pixelRatio
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)

          // 缓存节点和上下文
          this.canvasNode = canvas
          this.ctx = ctx
          // 缓存尺寸信息，避免重复获取
          this.canvasWidth = res[0].width
          this.canvasHeight = res[0].height

          this.renderCanvas(canvas, ctx, dataPoints)
        })
    },

    /**
     * 执行具体的 Canvas 绘制指令
     */
    renderCanvas(canvas, ctx, dataPoints) {
      const width = this.canvasWidth
      const height = this.canvasHeight

      // 使用 requestAnimationFrame 优化动画帧
      canvas.requestAnimationFrame(() => {
        // 清空画布
        ctx.clearRect(0, 0, width, height)

        // 绘制参数
        const paddingX = width / 14 // 左右留白半个格子
        const stepX = width / 7
        const maxY = 5 // 最大分数
        const marginY = 20 // 上下边距
        const availableHeight = height - marginY * 2

        // 坐标转换函数
        const getX = (index) => paddingX + index * stepX
        const getY = (score) => height - marginY - (score / maxY) * availableHeight

        // 1. 绘制连接线 (平滑曲线)
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 2
        
        // 起点
        ctx.moveTo(getX(0), getY(dataPoints[0]))

        // 贝塞尔曲线连接
        for (let i = 0; i < dataPoints.length - 1; i++) {
          const currX = getX(i)
          const currY = getY(dataPoints[i])
          const nextX = getX(i + 1)
          const nextY = getY(dataPoints[i + 1])
          
          const cp1x = currX + (nextX - currX) / 2
          const cp1y = currY
          const cp2x = currX + (nextX - currX) / 2
          const cp2y = nextY

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, nextX, nextY)
        }
        ctx.stroke()

        // 2. 绘制数据点
        dataPoints.forEach((score, index) => {
          const x = getX(index)
          const y = getY(score)

          ctx.beginPath()
          ctx.fillStyle = '#fff'
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fill()
          
          // 选中日期的光环效果
          if (this.data.weekDates[index].fullDate === this.data.selectedDate) {
            ctx.beginPath()
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
            ctx.lineWidth = 4
            ctx.arc(x, y, 6, 0, Math.PI * 2)
            ctx.stroke()
          }
        })
      })
    },

    /**
     * 点击日期
     */
    onDateTap(e) {
      const date = e.currentTarget.dataset.date
      this.setData({ selectedDate: date })
      // 重新绘制以更新选中态
      this.initData() 
      // 触发外部事件
      this.triggerEvent('datechange', { date })
    },

    /**
     * 触摸事件 - 左右滑动切换周
     */
    onTouchStart(e) {
      if (e.touches.length === 1) {
        this.setData({
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY
        })
      }
    },

    onTouchEnd(e) {
      if (e.changedTouches.length === 1) {
        const endX = e.changedTouches[0].clientX
        const distX = endX - this.data.startX
        
        if (Math.abs(distX) > 50) {
          const d = new Date(this.data.currentWeekStart)
          if (distX > 0) {
            // 右滑 -> 上一周
            d.setDate(d.getDate() - 7)
          } else {
            // 左滑 -> 下一周
            d.setDate(d.getDate() + 7)
          }
          this.setData({ currentWeekStart: d })
          this.initData()
        }
      }
    }
  }
})