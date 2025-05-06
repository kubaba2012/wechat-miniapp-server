const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('Configuring WeChat MCP Server...');

// 自动构建项目
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error('Build failed:', error);
    return;
  }
  
  console.log('Build completed successfully');
  
  // 自动更新MCP配置
  const mcpConfigPath = path.join(
    process.env.APPDATA || 
    path.join(process.env.HOME, '.config'),
    'Code/User/globalStorage/tencent-cloud.coding-copilot/settings/Craft_mcp_settings.json'
  );
  
  const config = {
    mcpServers: {
      "wechat-miniapp": {
        command: "npx",
        args: ["wechat-mcp", "start"],
        env: {},
        disabled: false,
        autoApprove: []
      }
    }
  };
  
  fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2));
  console.log('MCP configuration updated');
});