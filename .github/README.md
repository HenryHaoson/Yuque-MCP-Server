# GitHub Actions 工作流使用说明

## 工作流概述

本仓库配置了以下 GitHub Actions 工作流：

1. **版本更新 (version-bump)**: 用于自动更新 npm 包版本号
2. **NPM 包发布 (npm-publish)**: 用于自动构建并发布 npm 包到 npmjs.com

## 使用方法

### 版本更新工作流

此工作流允许你通过 GitHub 界面手动触发版本更新：

1. 进入仓库的 "Actions" 选项卡
2. 选择 "版本更新" 工作流
3. 点击 "Run workflow" 按钮
4. 选择版本更新类型（patch、minor 或 major）
5. 点击 "Run workflow" 确认

工作流将自动：
- 更新 package.json 中的版本号
- 创建对应的 Git 标签
- 提交并推送所有更改

### NPM 包发布工作流

此工作流在以下情况下自动触发：

1. 当创建新的 GitHub Release 时
2. 手动触发时

要手动触发发布流程：
1. 进入仓库的 "Actions" 选项卡
2. 选择 "发布 NPM 包" 工作流
3. 点击 "Run workflow" 按钮
4. 点击 "Run workflow" 确认

## 配置 npm 发布令牌

要使 NPM 发布工作流正常工作，需要在 GitHub 仓库中配置 NPM 令牌：

1. 在 npm 网站上生成访问令牌 (https://www.npmjs.com/settings/[用户名]/tokens)
2. 在 GitHub 仓库中，进入 "Settings" > "Secrets and variables" > "Actions"
3. 点击 "New repository secret"
4. 名称填写 `NPM_TOKEN`，值填写你的 npm 访问令牌
5. 点击 "Add secret" 保存 