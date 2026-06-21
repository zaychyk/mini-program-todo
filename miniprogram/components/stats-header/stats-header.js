// 统计头部组件
Component({
  properties: {
    // 统计数据：{ total, active, completed }
    stats: {
      type: Object,
      value: { total: 0, active: 0, completed: 0 }
    }
  }
});
