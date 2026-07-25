# 火车票排版打印

一个基于 Web 的火车票电子客票排版工具，支持 PDF 车票上传、自动裁剪白边、2×2 拖拽排版，并导出为 A4 横向单页 PDF，方便打印。

## 功能

- **PDF 上传** — 拖拽或点击上传电子客票 PDF
- **自动裁剪** — 识别车票内容区域，自动裁掉白边
- **2×2 拼版** — 四张车票排列在一张 A4 横向页面
- **拖拽排序** — 在预览区拖拽车票调整位置，落点有票则自动交换
- **参数调节** — 装订线、间距、边距可自由调整
- **自动命名** — 根据行程日期自动生成导出文件名
- **深色/浅色主题**

## 使用

### 在线使用

访问 GitHub Pages 部署地址即可使用，无需安装。

### 本地开发

```bash
git clone <repo-url>
cd ticket-print/app
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`。

### 构建

```bash
npm run build
```

构建产物在 `app/dist/` 目录。

## 技术栈

- [React](https://react.dev) 19
- [Vite](https://vite.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [pdf-lib](https://pdf-lib.js.org) — PDF 生成
- [pdfjs-dist](https://mozilla.github.io/pdf.js) — PDF 渲染
- [shadcn/ui](https://ui.shadcn.com) — UI 组件
- [Framer Motion](https://www.framer.com/motion) — 动画

## License

MIT
