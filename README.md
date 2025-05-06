# WeChat MiniProgram MCP Server

一个用于微信小程序开发的MCP（Model Context Protocol）服务器，提供与微信开发者工具的深度集成。

## 功能特点

- 创建小程序页面和组件
- 自动生成标准的文件结构
- 与微信开发者工具CLI集成
- 支持项目预览和发布
- 支持npm构建

## 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/wechat-miniapp-server.git

# 进入项目目录
cd wechat-miniapp-server

# 安装依赖
npm install

# 构建项目
npm run build
```

## 配置

在使用服务器之前，需要在MCP设置文件中添加配置：

```json
{
  "mcpServers": {
    "wechat-miniapp": {
      "command": "node",
      "args": ["path/to/wechat-miniapp-server/build/index.js"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## 可用工具

### 1. configure
配置开发环境：
```javascript
{
  "cli": "微信开发者工具CLI路径",
  "projectPath": "小程序项目路径"
}
```

### 2. create_page
创建新页面：
```javascript
{
  "pagePath": "pages/index"
}
```

### 3. create_component
创建新组件：
```javascript
{
  "componentPath": "components/header"
}
```

### 4. open_project
在开发者工具中打开项目：
```javascript
{}
```

### 5. build_npm
构建npm包：
```javascript
{}
```

### 6. preview
预览小程序：
```javascript
{}
```

### 7. upload
上传小程序：
```javascript
{
  "version": "1.0.0",
  "desc": "版本描述"
}
```

## 使用示例

```javascript
// 配置环境
use_mcp_tool("wechat-miniapp", "configure", {
  "cli": "C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat",
  "projectPath": "D:/your-miniprogram-path"
});

// 创建页面
use_mcp_tool("wechat-miniapp", "create_page", {
  "pagePath": "pages/index"
});

// 预览项目
use_mcp_tool("wechat-miniapp", "preview", {});
```

## 开发

```bash
# 运行开发模式
npm run dev

# 构建项目
npm run build

# 启动服务器
npm start
```

## 注意事项

1. 使用前请确保已安装微信开发者工具
2. CLI路径需要指向微信开发者工具的cli.bat文件
3. 项目路径必须是有效的微信小程序项目目录
4. 上传功能需要微信开发者工具已登录并有相应的项目权限

## 许可证

ISC

## 贡献

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request