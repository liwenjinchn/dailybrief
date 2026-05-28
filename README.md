# dailybrief

**🌐 在线访问：** https://liwenjinchn.github.io/dailybrief/

每天一篇重磅研究，读完即出系统性分析。

## 是什么

一个静态 Web 应用，精选中文卖方深度报告、独立宏观研究、英文经典 memo，按节奏每天推一篇。读完后点击"生成分析"，从五个维度（核心论点 / 框架方法 / 数据证据 / 洞见盲点 / 个人启发）出系统性拆解。

## 技术栈

- 纯 HTML/CSS/JS，无框架、无构建步骤
- JSON 数据文件维护文章清单
- 部署在 GitHub Pages
- 可选：客户端调用 LLM API 生成分析（用户自备 key，存浏览器 localStorage）

## 本地运行

```bash
# 无需安装依赖，直接打开
open index.html
# 或用任意静态服务器
python3 -m http.server 8000
```

## 内容来源（MVP 20 篇）

- 中文卖方：中金、广发宏观、招商宏观、华泰策略
- 独立研究：付鹏、洪灏、高善文
- 英文：Howard Marks memos、BlackRock Institute、BIS

## License

MIT
