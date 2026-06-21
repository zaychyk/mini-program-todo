# 待办清单小程序（Todo List）

移动终端程序设计课程结课作业 —— 一个基于 **微信云开发** 的待办清单小程序。

![微信版本](https://img.shields.io/badge/微信-开发者工具-green?logo=wechat)
![云开发](https://img.shields.io/badge/后端-微信云开发-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 📝 增删改查 | 通过云函数实现完整的 CRUD 操作，数据存储在云数据库 |
| 🔍 关键词搜索 | 实时搜索待办内容，支持模糊匹配 |
| 🏷️ 优先级筛选 | 高 / 中 / 低三级优先级，支持快速切换 |
| 📊 状态筛选 | 全部 / 进行中 / 已完成三种视图 |
| 👆 手势交互 | 左滑删除、右滑完成（含动画反馈） |
| 🎨 现代 UI | 自定义组件架构，简洁现代的视觉设计 |
| 📦 组件化 | 提取 3 个自定义组件，职责清晰、易于维护 |

---

## 🏗️ 项目架构

```
├── miniprogram/                          ← 前端（WXML / WXSS / JS）
│   ├── app.js                            ← 云开发初始化
│   ├── components/
│   │   ├── stats-header/                 ← 统计头部组件
│   │   ├── add-modal/                    ← 新增/编辑弹窗组件
│   │   └── todo-item/                    ← 待办条目组件（手势交互）
│   └── pages/index/                      ← 页面：筛选、搜索、云函数调用
│
├── cloudfunctions/
    └── todoFunctions/                    ← 云函数：待办 CRUD 全部操作
        ├── index.js                      ← list / add / update / delete / toggle / clearCompleted
        └── package.json                  ← 依赖：wx-server-sdk ~2.4.0
```

### 自定义组件

| 组件 | 职责 | 与父组件通信 |
|------|------|-------------|
| `stats-header` | 展示头部统计数据 | 通过 `properties.stats` 接收 |
| `add-modal` | 管理表单状态与输入校验 | `showAdd()` / `showEdit()` 方法控制，`confirm` 事件抛出数据 |
| `todo-item` | 封装滑动手势、完成动画、点击事件 | `toggle` / `edit` / `delete` / `completeswipe` 事件冒泡 |

---

## 🛠️ 技术栈

- **前端**：微信小程序原生开发（WXML + WXSS + JS）
- **后端**：微信云函数（Node.js）
- **数据库**：微信云数据库（`todos` 集合）
- **布局**：Flexbox 响应式布局，尺寸使用 `rpx` 单位

---

## 🚀 快速开始

### 前置条件

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 注册微信小程序账号，获取 AppID
3. 开通云开发，获取云环境 ID

### 运行步骤

**1. 克隆仓库**
```bash
git clone https://github.com/zaychyk/mini-program-todo.git
```

**2. 配置云环境 ID**

打开 `miniprogram/app.js`，将 `env` 修改为你的云环境 ID：
```javascript
wx.cloud.init({
  env: '你的云环境ID',  // ← 修改此处
  traceUser: true
});
```

**3. 导入项目**

在微信开发者工具中选择「导入项目」，目录选择仓库根目录，填入你的 AppID。

**4. 创建数据库集合**

在云开发控制台 → 数据库中，新建集合 `todos`。

**5. 部署云函数**

在开发者工具中右键 `cloudfunctions/todoFunctions` → 「上传并部署：云端安装依赖」

或使用脚本：
```bash
bash uploadCloudFunction.sh
```

**6. 编译运行**

点击开发者工具顶部的「编译」按钮即可预览。


## 📖 核心设计

### 数据模型

```javascript
{
  _id: String,         // 云数据库自动生成
  _openid: String,     // 云函数自动注入，标识用户
  title: String,       // 待办内容
  priority: String,    // 'high' | 'medium' | 'low'
  completed: Boolean,  // 是否已完成
  createdAt: String,   // 格式化日期 "MM-DD HH:mm"
  timestamp: Number    // 毫秒级时间戳，用于排序
}
```

### 排序规则

未完成项优先 → 按优先级（high > medium > low） → 按时间戳倒序

### 云函数 Action 路由

| Action | 功能 |
|--------|------|
| `list` | 分页查询全部待办（每批 100 条） |
| `add` | 新增待办 |
| `update` | 修改标题或优先级 |
| `delete` | 删除单条待办 |
| `toggle` | 切换完成状态 |
| `clearCompleted` | 批量清除已完成项 |

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 👨‍💻 作者

课程作业项目，仅供学习交流。
