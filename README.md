# KKCrop 图片等比分割工具
![KKCrop Logo](assets/icon.png)

## 简介
KKCrop 是一个基于 Electron + Vite 的桌面应用，将图片按横纵等比分割，并支持导出为图片或 PDF。界面使用 TailwindCSS，图像处理使用 `sharp`，PDF 生成使用 `pdf-lib`。

## 特性
- 图片等比分割：自定义横向(X)与纵向(Y)数量，实时预览。
- 结果导出：保存为图片或合并为 PDF。
- 现代界面：三步式流程，响应式布局，简洁易用。

## 环境要求
- Node.js `>= 18.17` 或 `>= 20.3`
- Yarn v1（或 npm；若用 Yarn PnP，请确保使用 `node-modules` 方式）
- Windows/Mac/Linux 均可开发与运行

## 安装与开发
- 安装依赖：`yarn` 或 `npm install`
- 开发运行：`yarn start`
- 构建安装包：`yarn make:win`（Windows）

## 关键打包说明（sharp 与 pdf-lib）
- `pdf-lib`：作为普通依赖打入主进程 bundle，无需外部化。
- `sharp`（原生模块）：
  - 代码层使用 `createRequire` 加载：`const sharp = require('sharp')`。
  - 打包配置解包原生文件：`asar: { smartUnpack: true, unpack: '**/node_modules/sharp/**', unpackDir: '**/node_modules/@img/**' }`。
  - 打包阶段复制依赖到构建产物：`sharp`、`detect-libc`、`semver` 以及整个 `@img` 目录。
  - 允许从 `app.asar.unpacked` 加载原生模块：`OnlyLoadAppFromAsar: false`。

## 常见问题与解决
- 报错 “Cannot find package 'pdf-lib'”
  - 原因：被错误标记为 external 未打入 bundle。
  - 解决：取消 external，保持打入主进程。
- 报错 “Could not load the 'sharp' module using the win32-x64 runtime”
  - 检查安装机的 `resources/app.node_modules/` 下是否存在 `sharp`、`detect-libc`、`semver`、`@img/sharp-win32-x64`；并确认 `resources/app.asar.unpacked/node_modules/sharp` 下存在 `vendor` 与 `build/Release/sharp.node`。
  - 若缺失，重新安装并重建：`npm install --include=optional --os=win32 --cpu=x64 sharp@0.34.4 --force && npm rebuild sharp --force`，然后重新 `yarn make:win`。
  - 仍失败可尝试 `sharp@0.32.6`（旧版本 vendor 在包内，无 @img 拆分）。

## 使用流程
1. 选择图片（支持 JPG/PNG/GIF/BMP）。
2. 设置分割数量，查看预览与网格覆盖。
3. 保存为图片或 PDF，并可继续处理下一张。

## 目录结构
```
KKCrop/
├── assets/            # 图标与静态资源
├── src/               # 源码（main/preload/renderer）
├── index.html         # 主窗口页面
├── forge.config.cjs   # Forge 打包配置
├── vite.*.config.mjs  # Vite 构建配置
└── package.json       # 项目脚本与依赖
```

## 脚本
- 开发启动：`yarn start`
- 打包生成安装包：`yarn make:win`
- 直接使用 electron-packager（可选）：`yarn make:direct:win`

## 许可证
- MIT License

## 联系
- 作者：HunDegong
- 邮箱：691325380@qq.com