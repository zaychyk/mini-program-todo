// 待办条目组件 — 封装手势交互（左滑删除、右滑完成、勾选、编辑）
// 对外抛出事件：toggle / edit / delete / completeswipe
// 内部管理 offsetX 用于滑动动画，通过 observer 在数据更新时自动重置
Component({
  properties: {
    // 单条待办事项数据（来自云数据库）
    todo: {
      type: Object,
      value: {}
    }
  },

  data: {
    offsetX: 0,       // 滑动偏移量（负值=左滑露出删除区，正值=右滑完成动画）
    rawDeltaX: 0,     // 手势向右的最大滑动距离，用于右滑完成判断
    startOffsetX: 0,  // 触摸开始时的 offsetX，用于区分"收回删除区"和"右滑完成"
    startX: 0,        // 触摸起始 X 坐标
    startY: 0         // 触摸起始 Y 坐标
  },

  observers: {
    /**
     * 监听 todo 属性变化（父组件 loadTodos 后数据刷新）
     * 自动重置滑动偏移量，确保数据与 UI 同步
     */
    'todo': function() {
      this.setData({ offsetX: 0 });
    }
  },

  methods: {
    // ===== 点击事件：向外抛出，由父组件处理实际业务 =====

    /**
     * 点击复选框 — 向外抛出 toggle 事件
     */
    onToggle() {
      this.triggerEvent('toggle', { id: this.data.todo._id });
    },

    /**
     * 点击内容区域 — 向外抛出 edit 事件（仅未完成项可编辑）
     */
    onEdit() {
      if (this.data.todo.completed) return;
      this.triggerEvent('edit', { id: this.data.todo._id });
    },

    /**
     * 点击删除按钮 — 向外抛出 delete 事件
     */
    onDelete() {
      this.triggerEvent('delete', { id: this.data.todo._id });
    },

    // ===== 滑动手势处理 =====

    /**
     * 触摸开始 — 记录起始坐标和当前 offsetX 状态
     */
    onTouchStart(e) {
      this.setData({
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        rawDeltaX: 0,
        startOffsetX: this.data.offsetX
      });
    },

    /**
     * 触摸移动 — 判断滑动方向并更新偏移量
     * 左滑：露出删除按钮（最大 -80px）
     * 右滑：收回删除区，并记录距离（用于完成判断）
     */
    onTouchMove(e) {
      const moveX = e.touches[0].clientX;
      const moveY = e.touches[0].clientY;
      const { startX, startY, offsetX } = this.data;

      const deltaX = moveX - startX;
      const deltaY = moveY - startY;

      // 记录向右滑动的最大距离（负值取 0）
      const rawDeltaX = Math.max(0, deltaX);

      // 水平滑动距离大于垂直滑动，才认为是横向手势
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0) {
        // 左滑：限制最大偏移量为 -80px
        this.setData({ offsetX: Math.max(deltaX, -80), rawDeltaX });
      } else if (deltaX > 0 && offsetX < 0) {
        // 右滑：收回删除区
        this.setData({ offsetX: 0, rawDeltaX });
      } else if (deltaX > 0) {
        this.setData({ rawDeltaX });
      }
    },

    /**
     * 触摸结束 — 根据手势意图执行操作
     *
     * 判断逻辑（用 startOffsetX 区分手势意图）：
     *   - 开始时收起（offsetX=0）且右滑 > 50px → 触发右滑完成动画
     *   - 开始时删除区展开（offsetX=-80）→ 右滑仅收起
     *   - 左滑 > 40px 阈值 → 保持展开，否则回弹
     */
    onTouchEnd() {
      const { offsetX, rawDeltaX, startOffsetX, todo } = this.data;

      // 右滑完成：从收起状态右滑超过 50px，且当前未完成
      if (startOffsetX === 0 && rawDeltaX > 50 && !todo.completed) {
        // 向右滑出，播放完成动画
        this.setData({ offsetX: 60, rawDeltaX: 0 });
        // 动画播放完毕后，重置位置并通知父组件处理业务
        setTimeout(() => {
          this.setData({ offsetX: 0 });
          this.triggerEvent('completeswipe', { id: todo._id });
        }, 300);
        return;
      }

      // 其余情况：根据左滑阈值决定保持展开或回弹
      this.setData({
        offsetX: offsetX < -40 ? -80 : 0,
        rawDeltaX: 0
      });
    }
  }
});
