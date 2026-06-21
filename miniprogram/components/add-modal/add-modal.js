// 新增/编辑弹窗组件 — 内部自管理表单状态
// 对外暴露 showAdd() / showEdit() 方法，通过 triggerEvent 与父组件通信
Component({
  properties: {
    // 控制弹窗显示/隐藏
    show: { type: Boolean, value: false }
  },

  data: {
    isEdit: false,         // 是否为编辑模式
    editId: null,          // 编辑模式下的待办事项 _id
    inputTitle: '',        // 标题输入框内容
    inputPriority: 'medium'// 当前选择的优先级
  },

  observers: {
    /**
     * 监听 show 属性变化
     * 打开弹窗时：若为新增模式则重置表单；编辑模式由 showEdit() 负责填充
     */
    'show': function(val) {
      if (val && !this.data.isEdit) {
        this.setData({
          inputTitle: '',
          inputPriority: 'medium'
        });
      }
    }
  },

  methods: {
    /**
     * 打开新增弹窗（由父组件通过 selectComponent 调用）
     */
    showAdd() {
      this.setData({
        isEdit: false,
        editId: null,
        inputTitle: '',
        inputPriority: 'medium'
      });
      this.triggerEvent('open');
    },

    /**
     * 打开编辑弹窗（由父组件通过 selectComponent 调用）
     * @param {Object} todo - 待编辑的待办事项数据
     */
    showEdit(todo) {
      this.setData({
        isEdit: true,
        editId: todo._id,
        inputTitle: todo.title,
        inputPriority: todo.priority
      });
      this.triggerEvent('open');
    },

    /**
     * 关闭弹窗
     */
    hideModal() {
      this.triggerEvent('close');
    },

    /**
     * 阻止遮罩层的触摸事件穿透到页面
     */
    preventTouchMove() {},

    /**
     * 监听标题输入框内容变化
     */
    onInput(e) {
      this.setData({ inputTitle: e.detail.value });
    },

    /**
     * 监听优先级选择
     */
    onSelectPriority(e) {
      this.setData({ inputPriority: e.currentTarget.dataset.priority });
    },

    /**
     * 确认按钮点击 — 校验输入后向外抛出 confirm 事件
     * 事件详情：{ isEdit, editId, title, priority }
     */
    onConfirm() {
      const { inputTitle, inputPriority, isEdit, editId } = this.data;
      const title = inputTitle.trim();

      if (!title) {
        wx.showToast({ title: '请输入待办内容', icon: 'none' });
        return;
      }

      this.triggerEvent('confirm', {
        isEdit,
        editId,
        title,
        priority: inputPriority
      });
    }
  }
});
