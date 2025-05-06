#!/usr/bin/env node
const { program } = require('commander');
const { spawn } = require('child_process');

program
  .name('wechat-mcp')
  .description('WeChat MiniProgram MCP Server CLI')
  .version('1.0.0');

program
  .command('start')
  .description('Start the MCP server')
  .action(() => {
    const server = spawn('node', ['build/index.js'], {
      stdio: 'inherit',
      shell: true
    });
    
    server.on('close', (code) => {
      process.exit(code);
    });
  });

program.parse(process.argv);