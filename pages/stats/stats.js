/**
 * @file stats.js
 * @description 统计页面逻辑：多维度统计、图表数据生成及导出功能
 * @created 2026-01-18
 * @author Trae AI
 */
const storage = require('../../utils/storage')
const util = require('../../utils/util')

Page({
  data: {
    tabs: ['按月统计', '按周统计', '自定义'],
    activeTab: 1, // 默认选中按周统计
    
    // 统计概览
    summary: { total: 0, completed: 0, failed: 0, rate: '0%' },
    
    // 图表数据 (用于绘制CSS饼图)
    chartData: null,
    
    // 自定义时间段
    startDate: util.formatTime(new Date()).substring(0, 10),
    endDate: util.formatTime(new Date()).substring(0, 10),
    
    isLoading: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
    this.refreshData()
  },

  onTabTap(e) {
    this.setData({ activeTab: e.currentTarget.dataset.index }, () => {
      this.refreshData()
    })
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value }, () => {
      if (this.data.activeTab === 2) {
        this.refreshData()
      }
    })
  },

  refreshData() {
    this.setData({ isLoading: true })
    
    // 模拟异步延迟，避免阻塞UI
    setTimeout(() => {
      const { activeTab, startDate, endDate } = this.data
      const reviews = storage.getReviews()
      
      let filteredReviews = []
      let chartData = []
      
      const now = new Date()
      
      if (activeTab === 0) {
        // 按月统计：当前月份
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        // 过滤当月数据
        filteredReviews = reviews.filter(r => {
          const d = new Date(r.createTime)
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth
        })

        // 图表数据：按天分组 (简单展示每3天或关键点，这里简化为展示本月所有有数据的天)
        // 为了图表美观，我们统计最近7天或者按周几分布，这里选择按“天”统计当月
        chartData = this.generatePieData(filteredReviews.length,
          filteredReviews.filter(r => !r.status || r.status === 'completed').length,
          filteredReviews.filter(r => r.status === 'failed').length
        )

      } else if (activeTab === 1) {
        // 按周统计：本周一到周日
        // 计算本周一
        const day = now.getDay() || 7
        const monday = new Date(now)
        monday.setDate(now.getDate() - day + 1)
        monday.setHours(0,0,0,0)
        
        filteredReviews = reviews.filter(r => {
          return new Date(r.createTime) >= monday
        })
        
        chartData = this.generatePieData(filteredReviews.length, 
          filteredReviews.filter(r => !r.status || r.status === 'completed').length,
          filteredReviews.filter(r => r.status === 'failed').length
        )
        
      } else {
        // 自定义时间段
        const start = new Date(startDate).setHours(0,0,0,0)
        const end = new Date(endDate).setHours(23,59,59,999)
        
        filteredReviews = reviews.filter(r => {
          const t = new Date(r.createTime).getTime()
          return t >= start && t <= end
        })
        
        chartData = this.generatePieData(filteredReviews.length,
          filteredReviews.filter(r => !r.status || r.status === 'completed').length,
          filteredReviews.filter(r => r.status === 'failed').length
        )
      }

      // 计算概览
      const total = filteredReviews.length
      const completed = filteredReviews.filter(r => !r.status || r.status === 'completed').length
      const failed = filteredReviews.filter(r => r.status === 'failed').length
      const rate = total > 0 ? Math.round((completed / total) * 100) + '%' : '0%'

      this.setData({
        summary: { total, completed, failed, rate },
        chartData,
        isLoading: false
      })
      
      // 绘制折线图 (最近7天)
      // 无论选哪个 Tab，这里默认展示最近7天的每日完成数趋势
      this.drawLineChart(reviews)
    }, 100)
  },

  // 绘制折线图
  drawLineChart(allReviews) {
    const query = this.createSelectorQuery()
    query.select('#lineChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const width = res[0].width
        const height = res[0].height

        const dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        const days = []
        const data = []
        const now = new Date()

        // 根据 activeTab 决定统计维度
        if (this.data.activeTab === 0) {
          // 按月统计：展示当年 1 月到 12 月
          const currentYear = now.getFullYear()
          for (let i = 1; i <= 12; i++) {
            days.push(`${i}月`)
            
            // 统计该月完成数
            const count = allReviews.filter(r => {
               const rd = new Date(r.createTime)
               return rd.getFullYear() === currentYear && (rd.getMonth() + 1) === i && (!r.status || r.status === 'completed')
            }).length
            data.push(count)
          }
        } else if (this.data.activeTab === 1) {
          // 按周统计：展示本周周一到周日
          const currentDay = now.getDay() || 7 // 1(Mon) - 7(Sun)
          // 计算本周一的日期
          const monday = new Date(now)
          monday.setDate(now.getDate() - currentDay + 1)

          const weekMap = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

          for (let i = 0; i < 7; i++) {
            const d = new Date(monday)
            d.setDate(monday.getDate() + i)
            const dateStr = util.formatTime(d).substring(0, 10).replace(/\//g, '-')
            
            days.push(weekMap[i])
            
            // 统计该日完成的任务数
            const count = allReviews.filter(r => {
               const rd = new Date(r.createTime)
               const rdStr = util.formatTime(rd).substring(0, 10).replace(/\//g, '-')
               return rdStr === dateStr && (!r.status || r.status === 'completed')
            }).length
            data.push(count)
          }
        } else {
          // 自定义：展示最近 7 天
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(now.getDate() - i)
            const dateStr = util.formatTime(d).substring(0, 10).replace(/\//g, '-') // YYYY-MM-DD
            const monthDay = util.formatTime(d).substring(5, 10) // MM/DD used for label
            
            days.push(monthDay)
            
            // 统计该日完成的任务数
            const count = allReviews.filter(r => {
               const rd = new Date(r.createTime)
               const rdStr = util.formatTime(rd).substring(0, 10).replace(/\//g, '-')
               return rdStr === dateStr && (!r.status || r.status === 'completed')
            }).length
            data.push(count)
          }
        }

        // 绘图配置
        const padding = 20 // 减少内边距
        const graphWidth = width - padding * 2
        const graphHeight = height - padding * 2
        const maxVal = Math.max(...data, 5) // Y轴最大值，至少为5
        
        ctx.clearRect(0, 0, width, height)
        
        // 绘制坐标轴 (仅保留底部 X 轴线，移除 Y 轴线和刻度)
        // 实际上 X 轴线通常也不需要，除非要强调底边。需求说“保留底部的日期标签”，通常意味着不需要轴线本身，或者只需要底边线。
        // 为了简洁，我们不画轴线，只画日期标签。或者只画一条底边线。
        // 需求：移除x轴的轴线及刻度线，但保留底部的日期标签
        
        // 所以我们不执行 ctx.stroke() 画轴线
        
        // 绘制折线
        if (data.length > 0) {
          ctx.beginPath()
          ctx.strokeStyle = '#07c160'
          ctx.lineWidth = 2
          
          const stepX = graphWidth / (data.length - 1)
          
          data.forEach((val, index) => {
            const x = padding + index * stepX
            const y = height - padding - (val / maxVal) * graphHeight
            
            if (index === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          })
          ctx.stroke()
          
          // 绘制数据点和标签
          ctx.fillStyle = '#07c160'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          
          data.forEach((val, index) => {
            const x = padding + index * stepX
            const y = height - padding - (val / maxVal) * graphHeight
            
            // 点
            ctx.beginPath()
            ctx.arc(x, y, 3, 0, Math.PI * 2)
            ctx.fill()
            
            // 数值
            
            // X轴日期/月份
            ctx.fillStyle = '#999'
            ctx.fillText(days[index], x, height - padding + 15)
            ctx.fillStyle = '#07c160' // 恢复颜色
          })
        }
      })
  },

  // 生成饼图数据
  generatePieData(total, completed, failed) {
    if (total === 0) {
      return {
        hasData: false,
        style: 'background: #e0e0e0' // 灰色占位
      }
    }

    const completedDeg = Math.round((completed / total) * 360)
    
    // 使用 conic-gradient 生成饼图
    // 绿色从 0deg 到 completedDeg，红色从 completedDeg 到 360deg
    return {
      hasData: true,
      style: `background: conic-gradient(#07c160 0deg ${completedDeg}deg, #f44336 ${completedDeg}deg 360deg)`,
      completedPercent: Math.round((completed / total) * 100) + '%',
      failedPercent: Math.round((failed / total) * 100) + '%'
    }
  }
})