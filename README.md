# VibeResume Editor

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](package.json)
[![Python](https://img.shields.io/badge/python-3.x-3776ab?logo=python&logoColor=white)](serve.py)
[![Web to PDF](https://img.shields.io/badge/web--to--PDF-Chromium-2563eb)](scripts/export-pdf.mjs)

一个可视化编辑、可保存、可导出 PDF 的网页简历编辑器。支持多份简历管理、模板样式切换、密度调节、双模式 PDF 导出（A4 打印版 & 长页版）。

本项目从 [**Vibe Resume 项目二改**](https://github.com/LiuMengxuan04/vibe-resume) 而来，在原有 HTML/CSS 简历与 Chromium 导出流程基础上，增加了左侧可视化编辑器、富文本加粗/斜体、撤销、块排序、统一后台服务和一键启动脚本。公开仓库中的简历内容均为 mock 模板，不包含真实个人经历。

![VibeResume Editor preview](assets/preview.png)

## 功能

### 简历管理
- `resumes/*.html` 是本地简历内容文件，可在编辑器顶部下拉框中来回切换。
- 支持管理多份简历：**新建简历**、**重命名**、**删除**，均在顶部工具栏操作。
- 编辑器支持**多标签页安全锁**：同一份简历在不同窗口打开时，保存操作会被拒绝。
- 关闭标签页前会自动检测未保存修改并弹出确认框。

### 可视化编辑
- `editor.html` 提供**左右分栏编辑体验**：左侧编辑字段，右侧实时预览简历。
- 支持富文本**加粗和斜体**：选中文字后使用悬浮工具条，或使用 `Ctrl+B` / `Ctrl+I`。
- 支持 `Ctrl+S` 保存当前简历，`Ctrl+Z` 撤销误操作。
- 支持教育背景、实习经历、**校园经历**、项目经历、技能和**自定义模块**的增删改。
- 支持所有模块内的条目**上下移动排序**。
- 支持**模块顺序重排**：在右侧「实时预览」面板使用按钮调整各模块的排列顺序。

### 🎨 模板样式与密度
- **模板切换**：在顶部工具栏可选择「现代」或「**HR紧凑**」风格，实时切换简历外观。
  - `modern`：经典双栏现代风格
  - `compact-hr`：专为求职场景优化的紧凑风格，头像是小方图、字体更精炼
- **密度控制**：支持「标准」→「紧凑」→「**极紧凑**」三档密度，精细控制页面留白。
  - 切换后自动记录撤销历史，可 `Ctrl+Z` 回退
  - 样式和密度随简历文件一起保存，下次打开自动恢复

### 📄 PDF 导出（双模式）
- 点击「📄 导出 PDF」弹出**导出模式选择框**，用户可自主选择：
  - **A4 多页打印版**：适合纸质打印，使用 `@page` CSS 自动分页，续页添加姓名·方向页眉和页码
  - **一页长简历版**：适合线上投递和网页预览，只生成一页长 PDF，内容精确贴合
- 导出文件名自动添加 `-A4打印版` 或 `-长页版` 后缀，避免覆盖
- 按 `Esc` 可取消导出模式选择

## 快速开始

安装依赖：

```bash
npm install
```

Windows 一键启动：

```bat
start.bat
```

或者使用命令行启动统一服务：

```bash
npm run preview
```

打开：

```text
http://127.0.0.1:4173/editor.html
```

### 命令行导出 PDF

支持指定导出模式（`--mode a4` 或 `--mode long`）：

```bash
# A4 多页打印版
npm run export:pdf -- --mode a4 --input resumes/你的简历.html export/你的简历-A4.pdf

# 一页长简历版
npm run export:pdf -- --mode long --input resumes/你的简历.html export/你的简历-长页.pdf
```

未指定 `--mode` 时默认使用 A4 模式。未指定 `--input` 时读取旧兼容文件 `index.html`，默认输出 `export/vibe-resume-demo.pdf`。

## 使用方式

1. 打开 `editor.html`。
2. 使用顶部下拉框切换已有简历，或点击「＋」新建一份简历，也可点「重命名」或「删除」管理简历。
3. 点击顶部「模板」或「密度」下拉框切换简历外观风格。
4. 在左侧修改姓名、教育、实习、校园经历、项目、技能和自定义模块。
5. 选中左侧富文本里的局部文字，使用悬浮工具条设置加粗或斜体。
6. 修改完成后让输入框失焦，右侧预览会同步更新。
7. 使用 `Ctrl+S` 或「💾 保存当前简历」按钮保存到当前文件。
8. 点击「📄 导出 PDF」，在弹出的对话框中选择 **A4 多页打印版** 或 **一页长简历版**。

如果只想静态预览某份简历，可以在服务启动后打开 `http://127.0.0.1:4173/resumes/文件名.html`。

## 模板内容说明

当前模板使用 `Alex Chen` 作为默认示例人物，电话、邮箱、学校、公司、经历和技能均为 mock 内容。

- `assets/avatar-placeholder.svg` 是默认 SVG 占位头像，不是真人照片。
- 哔哩哔哩和华为名称只作为示例演示，模板中已标注 `（仅为示例演示）`。
- 项目经历使用通用 mock 示例，链接为 `github.com/example/...` 占位地址。
- 用户发布自己的公开仓库前，应替换或删除所有真实手机号、邮箱、照片、学校和经历。

## 英文简历支持

`templates/resume-en.html` 是英文简历模板，适合外企或国际投递场景。使用方法：

1. 在编辑器中新建简历后，可将 `templates/resume-en.html` 的内容复制到新建文件中。
2. 英文模板结构与中文模板兼容，编辑器的所有功能（样式切换、密度调节、PDF 导出）同样适用。

## 隐私与公开发布

**重要：公开发布前请务必注意以下事项**

- `resumes/*.html` 和 `index.html` 默认已加入 `.gitignore`，不会被推送到 GitHub。
- 本地编辑器使用 `resumes/*.html` 保存你真实的多份简历数据。
- `index.template.html` 是公开仓库中的默认模板文件（Alex Chen mock 数据），新建简历时会复制它。
- 如果你需要更新公开模板，请修改 `index.template.html` 后提交。
- 不要提交真人证件照、身份证明、手机号、私人邮箱或未公开履历。
- 不要把真实个人简历 PDF 放进 `export/` 后公开。
- 如果仓库历史里曾提交过隐私文件，不能直接把旧历史推到公开仓库。
- 推荐新建一个干净仓库，只用当前清理后的文件作为首个公开 commit。

## 项目结构

```text
.
├── assets/
│   ├── logos/
│   │   ├── bilibili-color.svg
│   │   └── huawei-color.svg
│   ├── avatar-placeholder.svg
│   └── preview.png
├── export/
│   └── *.pdf                    ← 导出 PDF 文件（.gitignore 保护，不推送）
├── scripts/
│   ├── export-pdf.mjs           ← Chromium PDF 导出（支持 A4 / 长页双模式）
│   ├── verify-editor-load.mjs   ← 旧验证命令兼容入口
│   ├── verify-editor-workflows.mjs ← 编辑器完整工作流验证（含样式/密度/导出模态框）
│   └── verify-a4-pdf-export.mjs ← A4 PDF 导出专项验证
├── resumes/
│   └── *.html                   ← 本地多份简历（.gitignore 保护，不推送）
├── templates/
│   └── resume-en.html           ← 英文简历模板（可直接导入使用）
├── skills/
│   └── vibe-resume-editor/
│       └── SKILL.md
├── editor.html
├── index.html                   ← 旧兼容/CLI 默认输入（.gitignore 保护，不推送）
├── index.template.html          ← 公开模板（Alex Chen mock 数据）
├── serve.py
├── start.bat
├── start.sh
├── styles.css
├── package.json
└── README.md
```

## 核心文件

- `resumes/*.html` 是编辑器实际加载、切换和保存的本地简历文件（已加入 `.gitignore`，不推送公开仓库）。
- `index.template.html` 是公开仓库中的模板文件（Alex Chen mock 数据），新建简历会以它作为默认内容。
- `index.html` 保留为旧兼容和 CLI 默认输入文件，真实内容同样不应提交。
- `editor.html`：可视化编辑器，包含表单、富文本工具条、预览和导出入口。
- `styles.css`：简历展示样式，包含 `template-compact-hr`、`density-compact`、`density-ultra` 等样式变体。
- `serve.py`：统一后台服务，负责静态文件、多简历管理、保存接口和 PDF 导出接口（透传 mode 参数）。
- `scripts/export-pdf.mjs`：使用本机 Chrome / Chromium 导出 PDF，支持 `--mode a4`（A4 多页打印，含页眉页码）和 `--mode long`（一页长简历，精确内容贴合）。
- `scripts/verify-editor-workflows.mjs`：验证编辑器初始渲染、简历切换、新建模板、自定义模块持久化、模板/密度切换、导出模式模态框等功能。
- `scripts/verify-a4-pdf-export.mjs`：A4 PDF 导出的专项回归验证（短简历留白、长简历分页、长页模式）。
- `templates/resume-en.html`：英文简历模板，结构兼容编辑器所有功能。

## 开发验证

检查 Python 服务语法：

```bash
python -m py_compile serve.py
```

检查导出脚本语法：

```bash
node --check scripts/export-pdf.mjs
```

验证编辑器完整工作流：

```bash
npm run verify:editor
```

验证 A4 PDF 导出：

```bash
npm run verify:a4-pdf
```

旧验证命令仍可使用：

```bash
node scripts/verify-editor-load.mjs
```

重新生成示例 PDF（指定模式）：

```bash
# A4 多页打印版
npm run export:pdf -- --mode a4 --input resumes/你的简历.html export/你的简历-A4.pdf

# 一页长简历版
npm run export:pdf -- --mode long --input resumes/你的简历.html export/你的简历-长页.pdf
```

## 可执行文件打包可行性

未来可以打包成便携式可执行文件。推荐路线是把 `serve.py` 或一个轻量 Node 服务打包为本地后台程序，并随包携带静态文件和启动脚本。需要额外处理：

- Chrome / Chromium 依赖：使用系统 Chrome，或随包携带 Chromium。
- 写入目录：保存 `resumes/*.html` 和导出 PDF 时需要可写路径。
- 端口占用：启动时探测端口并给出清晰提示。
- 隐私安全：不要把用户生成的真实简历放入模板安装目录。

## English

VibeResume Editor is a web-first resume editor with a visual editor, multi-resume management, template style switching, density control, and dual-mode Chromium-based PDF export (A4 multi-page with headers/pagination, and single long-page). It is a modified version of the Vibe Resume project.

The repository uses mock resume content only. Replace all placeholders before using it as a real resume.

## License

[MIT](LICENSE)