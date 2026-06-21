// 云函数入口文件 — 待办事项 CRUD 操作
const cloud = require('wx-server-sdk');

// 初始化云开发环境，云函数会自动使用当前部署的环境，无需手动指定
cloud.init();

// 获取云数据库引用
const db = cloud.database();
// 获取待办事项集合引用
const todoCollection = db.collection('todos');
// 获取数据库命令对象，用于构造查询条件（如 _、or、and 等）
const _ = db.command;

/**
 * 云函数主入口
 * 根据传入的 action 参数执行不同的数据库操作
 *
 * 支持的 action：
 *   - list          获取所有待办事项
 *   - add           新增一条待办事项
 *   - update        更新一条待办事项（标题、优先级）
 *   - delete        删除一条待办事项
 *   - toggle        切换一条待办事项的完成状态
 *   - clearCompleted 清除所有已完成的待办事项
 */
exports.main = async (event, context) => {
  const { action } = event;

  // 根据不同的 action 分发到对应的处理逻辑
  switch (action) {
    case 'list':
      return await handleList(event);
    case 'add':
      return await handleAdd(event);
    case 'update':
      return await handleUpdate(event);
    case 'delete':
      return await handleDelete(event);
    case 'toggle':
      return await handleToggle(event);
    case 'clearCompleted':
      return await handleClearCompleted(event);
    default:
      return { success: false, error: '未知的操作类型: ' + action };
  }
};

/**
 * 获取所有待办事项
 * 云数据库单次查询最多返回 100 条，这里使用分页方式获取全部数据
 */
async function handleList(event) {
  try {
    // 先获取总数，用于计算需要分页查询的次数
    const countResult = await todoCollection.count();
    const total = countResult.total;

    // 每次查询最多 100 条，计算需要查询的批次
    const batchSize = 100;
    const batchTimes = Math.ceil(total / batchSize);

    // 并发执行所有批次的查询，每个批次跳过不同的偏移量
    const tasks = [];
    for (let i = 0; i < batchTimes; i++) {
      tasks.push(
        todoCollection
          .orderBy('timestamp', 'desc') // 按时间戳倒序排列
          .skip(i * batchSize)
          .limit(batchSize)
          .get()
      );
    }

    // 等待所有批次查询完成
    const results = await Promise.all(tasks);
    // 将所有批次的结果合并为一个数组
    const todos = results.reduce((acc, cur) => acc.concat(cur.data), []);

    return { success: true, data: todos };
  } catch (err) {
    console.error('获取待办列表失败', err);
    return { success: false, error: err.message };
  }
}

/**
 * 新增一条待办事项
 * 接收参数：title（标题）、priority（优先级）
 * id、createdAt、timestamp、completed 由服务端自动生成
 */
async function handleAdd(event) {
  const { title, priority } = event;
  const now = new Date();

  try {
    // 获取当前用户的 openid（用于数据权限控制，可选）
    const wxContext = cloud.getWXContext();

    const result = await todoCollection.add({
      data: {
        title: title,
        priority: priority || 'medium',
        completed: false,
        // 格式化的创建时间，用于前端直接展示（格式：MM-DD HH:mm）
        createdAt: formatDate(now),
        // 毫秒级时间戳，用于排序
        timestamp: now.getTime(),
        // 记录创建者 openid，云函数中通过 getWXContext 获取
        _openid: wxContext.OPENID
      }
    });

    return {
      success: true,
      data: {
        _id: result._id, // 返回云数据库自动生成的 _id
        title: title,
        priority: priority || 'medium',
        completed: false,
        createdAt: formatDate(now),
        timestamp: now.getTime(),
        _openid: wxContext.OPENID
      }
    };
  } catch (err) {
    console.error('新增待办事项失败', err);
    return { success: false, error: err.message };
  }
}

/**
 * 更新一条待办事项
 * 接收参数：id（云数据库 _id）、title（新标题）、priority（新优先级）
 */
async function handleUpdate(event) {
  const { id, title, priority } = event;

  try {
    await todoCollection.doc(id).update({
      data: {
        title: title,
        priority: priority
      }
    });

    return { success: true };
  } catch (err) {
    console.error('更新待办事项失败', err);
    return { success: false, error: err.message };
  }
}

/**
 * 删除一条待办事项
 * 接收参数：id（云数据库 _id）
 */
async function handleDelete(event) {
  const { id } = event;

  try {
    await todoCollection.doc(id).remove();
    return { success: true };
  } catch (err) {
    console.error('删除待办事项失败', err);
    return { success: false, error: err.message };
  }
}

/**
 * 切换待办事项的完成/未完成状态
 * 接收参数：id（云数据库 _id）、completed（目标完成状态）
 */
async function handleToggle(event) {
  const { id, completed } = event;

  try {
    await todoCollection.doc(id).update({
      data: {
        completed: completed
      }
    });

    return { success: true };
  } catch (err) {
    console.error('切换完成状态失败', err);
    return { success: false, error: err.message };
  }
}

/**
 * 批量清除所有已完成的待办事项
 * 使用 where 条件筛选 completed === true 的记录，然后批量删除
 */
async function handleClearCompleted(event) {
  try {
    // 先查询所有已完成的记录（同样受单次 100 条限制）
    let removed = 0;
    let hasMore = true;

    // 循环删除，因为云数据库批量删除也有单次限制
    while (hasMore) {
      // 查询已完成的任务，每次最多取 100 条
      const res = await todoCollection
        .where({ completed: true })
        .limit(100)
        .get();

      if (res.data.length === 0) {
        hasMore = false;
        break;
      }

      // 并发删除本批次的所有记录
      const deleteTasks = res.data.map(todo =>
        todoCollection.doc(todo._id).remove()
      );
      await Promise.all(deleteTasks);
      removed += res.data.length;

      // 如果本批次不足 100 条，说明已经没有更多了
      if (res.data.length < 100) {
        hasMore = false;
      }
    }

    return { success: true, removed: removed };
  } catch (err) {
    console.error('清除已完成待办失败', err);
    return { success: false, error: err.message };
  }
}

/**
 * 工具函数：将 Date 对象格式化为 "MM-DD HH:mm" 格式字符串
 * @param {Date} date - 要格式化的日期对象
 * @returns {String} 格式化后的日期字符串
 */
function formatDate(date) {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}
