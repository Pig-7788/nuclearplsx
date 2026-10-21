# 核纪元 · Nuclear Epoch

交互式核能科普网页：辟谣实验室、核电站建造、反应堆控制台、剂量实验室与中国核电时间线。使用原生 HTML、CSS 和 JavaScript，无运行依赖，支持离线打开。

本分支 `study` 将完整应用保存在 [`nuclearplsx/`](nuclearplsx/) 目录中。玩法、项目结构、截图和数据说明见 [完整文档](nuclearplsx/README.md)。

## 本地运行

```bash
git clone --branch study --single-branch https://github.com/Pig-7788/nuclearplsx.git
cd nuclearplsx/nuclearplsx
python3 -m http.server 8000
```

访问 <http://localhost:8000>，也可以直接用浏览器打开应用目录中的 `index.html`。

## 验证

在仓库根目录运行（需要 Node.js 20 或更新版本，无需安装依赖）：

```bash
node --test nuclearplsx/tests/*.test.js
```

测试覆盖存档恢复与落盘、弹窗生命周期、控制台模型、题库交互、剂量刻度及换算、翻页与自动滚动。GitHub Actions 会在提交和拉取请求时执行同一套测试。

本项目为科普教学作品；模型与典型剂量数据不用于工程计算、真实操作训练或医疗判断。
