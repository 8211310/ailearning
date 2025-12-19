# AI自适应学习系统
# AI Adaptive Learning System

## 项目介绍
## Project Introduction

AI自适应学习系统是一个基于DeepSeek API的智能学习平台，能够根据用户的学习需求和进度，动态生成个性化的学习路径和内容。系统采用React + TypeScript开发，使用Vite作为构建工具，Tailwind CSS用于样式设计。

The AI Adaptive Learning System is an intelligent learning platform based on the DeepSeek API, which can dynamically generate personalized learning paths and content according to users' learning needs and progress. The system is developed with React + TypeScript, using Vite as the build tool and Tailwind CSS for style design.

## 功能特性
## Features

- ✨ 个性化学习路径生成
- ✨ Personalized learning path generation
- 🎯 多种教学风格选择（鼓励型、苏格拉底式、故事讲述者、幽默伙伴、严谨学者）
- 🎯 Multiple teaching style options (Encouraging, Socratic, Storyteller, Humorous, Scholarly)
- 📚 知识板块与实践评估相结合
- 📚 Combination of knowledge modules and practice assessments
- 💬 实时对话交互，支持流式输出
- 💬 Real-time dialogue interaction with streaming output support
- 📊 学习进度跟踪和薄弱点识别
- 📊 Learning progress tracking and weakness identification
- 🔄 支持重新规划学习路径
- 🔄 Support for replanning learning paths

## 技术栈
## Technology Stack

- **前端框架**：React 18
- **Frontend Framework**: React 18
- **开发语言**：TypeScript
- **Development Language**: TypeScript
- **构建工具**：Vite
- **Build Tool**: Vite
- **样式框架**：Tailwind CSS v3
- **Style Framework**: Tailwind CSS v3
- **AI API**：DeepSeek API
- **AI API**: DeepSeek API
- **组件库**：Lucide React（图标）
- **Component Library**: Lucide React (icons)

## 安装和使用
## Installation and Usage

### 环境要求
### Environment Requirements

- Node.js 16.x 或更高版本
- Node.js 16.x or higher
- npm 或 yarn 包管理器
- npm or yarn package manager

### 安装步骤
### Installation Steps

1. 克隆仓库
1. Clone the repository

```bash
git clone <repository-url>
cd adaptive-learning-system
```

2. 安装依赖
2. Install dependencies

```bash
npm install
```

3. 启动开发服务器
3. Start the development server

```bash
npm run dev
```

4. 在浏览器中访问 http://localhost:5173
4. Visit http://localhost:5173 in your browser

### 构建生产版本
### Build Production Version

```bash
npm run build
```

构建后的文件将位于 `dist` 目录中。

The built files will be in the `dist` directory.

## 项目结构
## Project Structure

```
.
├── src/
│   ├── adaptive_learning_final.tsx  # 主应用组件
│   ├── index.css                     # 全局样式
│   └── main.tsx                      # 应用入口
├── .gitignore                        # Git忽略文件
├── index.html                        # HTML模板
├── package.json                      # 项目配置和依赖
├── postcss.config.js                 # PostCSS配置
├── tailwind.config.js                # Tailwind CSS配置
├── tsconfig.json                     # TypeScript配置
├── tsconfig.node.json                # TypeScript Node配置
└── vite.config.ts                    # Vite配置
```

## 使用说明
## Usage Instructions

1. **选择学习主题**：在初始界面输入您想要学习的知识点
1. **Select Learning Topic**: Enter the knowledge point you want to learn on the initial interface
2. **选择教学风格**：从五种教学风格中选择一种适合您的
2. **Choose Teaching Style**: Select one of five teaching styles that suits you
3. **开始学习**：系统将为您生成学习路径，您可以按顺序学习或跳转到特定章节
3. **Start Learning**: The system will generate a learning path for you, and you can learn in order or jump to a specific chapter
4. **互动学习**：与AI进行对话，回答问题，完成实践评估
4. **Interactive Learning**: Have conversations with AI, answer questions, and complete practice assessments
5. **调整学习路径**：根据学习情况，可以要求AI重新规划剩余的学习路径
5. **Adjust Learning Path**: Based on your learning progress, you can ask AI to replan the remaining learning path

## API配置
## API Configuration

系统使用DeepSeek API，配置信息位于 `src/adaptive_learning_final.tsx` 文件中：

The system uses DeepSeek API, and the configuration information is located in the `src/adaptive_learning_final.tsx` file:

```typescript
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'your-api-key',
  dangerouslyAllowBrowser: true,
});
```

请将 `your-api-key` 替换为您自己的DeepSeek API密钥。

Please replace `your-api-key` with your own DeepSeek API key.

## 许可证
## License

MIT

## 贡献
## Contributing

欢迎提交Issue和Pull Request！

Welcome to submit Issues and Pull Requests!
