// pages/index/index.js
// 待办事项页面逻辑 — 使用云函数实现数据的增删改查
// 页面职责：数据加载、筛选/搜索逻辑、云函数调用
// 交互细节（滑动、弹窗表单）已下沉到对应组件中

const app = getApp(); // 获取全局 App 实例

Page({
  data: {
    todos: [],           // 全部待办事项列表（从云数据库加载）
    filteredTodos: [],   // 经过筛选和排序后用于展示的列表
    currentFilter: 'all',// 当前状态筛选：all（全部）、active（进行中）、completed（已完成）
    currentPriority: 'all', // 当前优先级筛选（all/high/medium/low），与状态筛选联动
    searchKeyword: '',   // 搜索栏关键字（为空则不过滤）
    showModal: false,    // 控制弹窗显示/隐藏（传递给 add-modal 组件）
    stats: {             // 头部统计数据（传递给 stats-header 组件）
      total: 0,
      active: 0,
      completed: 0
    }
  },

  onLoad() {
    // 页面加载时从云数据库获取待办事项列表
    this.loadTodos();
  },

  // ===== 数据加载（从云数据库） =====

  /**
   * 从云数据库加载所有待办事项
   * 调用 todoFunctions 云函数的 list action
   * 加载完成后自动更新统计和筛选
   */
  loadTodos() {
    wx.showLoading({ title: '加载中...', mask: true });

    wx.cloud.callFunction({
      name: 'todoFunctions',
      data: { action: 'list' }
    }).then(res => {
      wx.hideLoading();
      const result = res.result;

      if (result.success) {
        this.setData({ todos: result.data });
        this.updateStats();
        this.applyFilter();
      } else {
        console.error('加载待办列表失败', result.error);
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('调用云函数失败', err);
      wx.showToast({ title: '网络请求失败', icon: 'none' });
    });
  },

  // ===== 统计与筛选 =====

  /**
   * 更新头部统计数据（总数、进行中、已完成）
   */
  updateStats() {
    const { todos } = this.data;
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    this.setData({
      stats: { total, active: total - completed, completed }
    });
  },

  /**
   * 根据当前筛选条件过滤待办事项，并按规则排序
   *
   * 查询逻辑（体现"查"的功能）：
   *   1. 按状态筛选（全部/进行中/已完成）
   *   2. 按优先级筛选（全部/高/中/低）
   *   3. 按关键字搜索（匹配标题，忽略大小写）
   *   三个条件同时生效，展示复合查询能力
   *
   * 排序规则：未完成在前 → 按优先级（high > medium > low）→ 按时间戳倒序
   */
  applyFilter() {
    const { todos, currentFilter, currentPriority, searchKeyword } = this.data;
    const keyword = searchKeyword.trim().toLowerCase();
    let filtered;

    // 第一步：按状态筛选
    switch (currentFilter) {
      case 'active':
        filtered = todos.filter(t => !t.completed);
        break;
      case 'completed':
        filtered = todos.filter(t => t.completed);
        break;
      default:
        filtered = [...todos];
    }

    // 第二步：按优先级筛选（all 表示不过滤）
    if (currentPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === currentPriority);
    }

    // 第三步：按关键字搜索（对标题进行模糊匹配）
    if (keyword) {
      filtered = filtered.filter(t => t.title.toLowerCase().includes(keyword));
    }

    // 第四步：排序
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.timestamp - a.timestamp;
    });

    this.setData({ filteredTodos: filtered });
  },

  // ===== 筛选栏事件 =====

  onFilter(e) {
    this.setData({ currentFilter: e.currentTarget.dataset.filter });
    this.applyFilter();
  },

  onPriorityTap(e) {
    const priority = e.currentTarget.dataset.priority;
    const newPriority = this.data.currentPriority === priority ? 'all' : priority;
    this.setData({ currentPriority: newPriority });
    this.applyFilter();
  },

  onSearch(e) {
    this.setData({ searchKeyword: e.detail.value, currentPriority: 'all' });
    this.applyFilter();
  },

  onClearSearch() {
    this.setData({ searchKeyword: '', currentPriority: 'all' });
    this.applyFilter();
  },

  // ===== 弹窗事件（add-modal 组件回调） =====

  /**
   * 点击悬浮按钮 — 打开新增弹窗
   * 通过 selectComponent 获取组件实例，调用组件内部的 showAdd() 方法
   */
  showAddModal() {
    this.setData({ showModal: true });
    // 弹窗显示后调用组件方法重置为新增模式
    this.selectComponent('#addModal').showAdd();
  },

  /** 弹窗打开事件（组件通知页面） */
  onModalOpen() {},

  /** 弹窗关闭事件 */
  onModalClose() {
    this.setData({ showModal: false });
  },

  /**
   * 弹窗确认事件 — 根据 isEdit 判断是新增还是编辑
   * 事件详情：{ isEdit, editId, title, priority }
   */
  onModalConfirm(e) {
    const { isEdit, editId, title, priority } = e.detail;

    if (isEdit) {
      // ===== 编辑模式：调用云函数 update =====
      wx.showLoading({ title: '保存中...', mask: true });
      wx.cloud.callFunction({
        name: 'todoFunctions',
        data: { action: 'update', id: editId, title, priority }
      }).then(res => {
        wx.hideLoading();
        if (res.result.success) {
          wx.showToast({ title: '修改成功', icon: 'success' });
          this.setData({ showModal: false });
          this.loadTodos();
        } else {
          wx.showToast({ title: '修改失败', icon: 'none' });
        }
      }).catch(err => {
        wx.hideLoading();
        console.error('调用云函数失败', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      });
    } else {
      // ===== 新增模式：调用云函数 add =====
      wx.showLoading({ title: '添加中...', mask: true });
      wx.cloud.callFunction({
        name: 'todoFunctions',
        data: { action: 'add', title, priority }
      }).then(res => {
        wx.hideLoading();
        if (res.result.success) {
          wx.showToast({ title: '添加成功', icon: 'success' });
          this.setData({ showModal: false });
          this.loadTodos();
        } else {
          wx.showToast({ title: '添加失败', icon: 'none' });
        }
      }).catch(err => {
        wx.hideLoading();
        console.error('调用云函数失败', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      });
    }
  },

  // ===== 待办条目事件（todo-item 组件回调） =====

  /**
   * 点击复选框 — 切换完成状态
   * 组件内部管理视觉反馈，页面只负责调用云函数
   */
  onItemToggle(e) {
    const id = e.detail.id;
    const todo = this.data.todos.find(t => t._id === id);
    if (!todo) return;
    const newCompleted = !todo.completed;

    wx.showLoading({ title: '更新中...', mask: false });
    wx.cloud.callFunction({
      name: 'todoFunctions',
      data: { action: 'toggle', id, completed: newCompleted }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({ title: newCompleted ? '已完成' : '已恢复', icon: 'success' });
        this.loadTodos();
      } else {
        this.loadTodos();
        wx.showToast({ title: '操作失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('调用云函数失败', err);
      this.loadTodos();
      wx.showToast({ title: '网络请求失败', icon: 'none' });
    });
  },

  /**
   * 点击内容区域 — 打开编辑弹窗
   * 通过 selectComponent 获取弹窗实例，调用 showEdit() 传入当前数据
   */
  onItemEdit(e) {
    const id = e.detail.id;
    const todo = this.data.todos.find(t => t._id === id);
    if (!todo || todo.completed) return;

    this.setData({ showModal: true });
    this.selectComponent('#addModal').showEdit(todo);
  },

  /**
   * 点击删除按钮 — 弹出确认对话框后调用云函数删除
   */
  onItemDelete(e) {
    const id = e.detail.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条待办事项吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true });
          wx.cloud.callFunction({
            name: 'todoFunctions',
            data: { action: 'delete', id }
          }).then(res => {
            wx.hideLoading();
            if (res.result.success) {
              wx.showToast({ title: '已删除', icon: 'success' });
              this.loadTodos();
            } else {
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          }).catch(err => {
            wx.hideLoading();
            console.error('调用云函数失败', err);
            wx.showToast({ title: '网络请求失败', icon: 'none' });
          });
        }
      }
    });
  },

  /**
   * 右滑完成手势 — 组件已完成动画，页面只负责调用云函数
   * 与 onItemToggle 逻辑一致，但入口不同（手势 vs 点击）
   */
  onItemCompleteSwipe(e) {
    const id = e.detail.id;
    wx.cloud.callFunction({
      name: 'todoFunctions',
      data: { action: 'toggle', id, completed: true }
    }).then(res => {
      if (res.result.success) {
        wx.showToast({ title: '已完成', icon: 'success' });
        this.loadTodos();
      } else {
        this.loadTodos();
      }
    }).catch(err => {
      console.error('调用云函数失败', err);
      this.loadTodos();
    });
  },

  // ===== 清除所有已完成的待办事项 =====

  onClearCompleted() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有已完成的待办事项吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清除中...', mask: true });
          wx.cloud.callFunction({
            name: 'todoFunctions',
            data: { action: 'clearCompleted' }
          }).then(res => {
            wx.hideLoading();
            if (res.result.success) {
              wx.showToast({ title: '已清除', icon: 'success' });
              this.loadTodos();
            } else {
              wx.showToast({ title: '清除失败', icon: 'none' });
            }
          }).catch(err => {
            wx.hideLoading();
            console.error('调用云函数失败', err);
            wx.showToast({ title: '网络请求失败', icon: 'none' });
          });
        }
      }
    });
  }
});
