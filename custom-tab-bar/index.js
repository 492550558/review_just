Component({
  data: {
    selected: 0,
    color: "#999999",
    selectedColor: "#07c160",
    list: [
      {
        "pagePath": "/pages/index/index",
        "text": "主页"
      },
      {
        "pagePath": "/pages/schedule/schedule",
        "text": "日历"
      },
      {
        "pagePath": "/pages/stats/stats",
        "text": "统计"
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({url})
      // setData is handled in page's onShow to ensure sync
    }
  }
})