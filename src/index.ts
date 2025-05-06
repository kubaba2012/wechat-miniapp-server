#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface WxConfig {
  cli?: string;
  projectPath?: string;
}

class WechatMiniappServer {
  private server: Server;
  private config: WxConfig = {};

  constructor() {
    this.server = new Server(
      {
        name: 'wechat-miniapp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async createFileWithContent(filePath: string, content: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async executeDevCommand(command: string) {
    if (!this.config.cli) {
      throw new McpError(
        ErrorCode.ConfigurationError,
        'WeChat DevTools CLI path not configured'
      );
    }
    try {
      const { stdout, stderr } = await execAsync(`"${this.config.cli}" ${command}`);
      return { stdout, stderr };
    } catch (error) {
      throw new McpError(
        ErrorCode.ExecutionError,
        `Failed to execute command: ${error}`
      );
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'configure',
          description: '配置微信开发者工具CLI路径和项目路径',
          inputSchema: {
            type: 'object',
            properties: {
              cli: {
                type: 'string',
                description: '微信开发者工具CLI路径'
              },
              projectPath: {
                type: 'string',
                description: '小程序项目路径'
              }
            },
            required: ['cli', 'projectPath']
          }
        },
        {
          name: 'create_page',
          description: '创建微信小程序页面，包含WXML、WXSS、JS和JSON文件',
          inputSchema: {
            type: 'object',
            properties: {
              pagePath: {
                type: 'string',
                description: '页面路径（例如：pages/index或pages/user/profile）'
              }
            },
            required: ['pagePath']
          }
        },
        {
          name: 'create_component',
          description: '创建微信小程序自定义组件',
          inputSchema: {
            type: 'object',
            properties: {
              componentPath: {
                type: 'string',
                description: '组件路径（例如：components/header）'
              }
            },
            required: ['componentPath']
          }
        },
        {
          name: 'open_project',
          description: '在微信开发者工具中打开项目',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'build_npm',
          description: '构建npm包',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'preview',
          description: '预览小程序',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'upload',
          description: '上传小程序代码',
          inputSchema: {
            type: 'object',
            properties: {
              version: {
                type: 'string',
                description: '版本号'
              },
              desc: {
                type: 'string',
                description: '版本描述'
              }
            },
            required: ['version', 'desc']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'configure': {
          const { cli, projectPath } = request.params.arguments as WxConfig;
          this.config = { cli, projectPath };
          return {
            content: [
              {
                type: 'text',
                text: `Configuration updated:\nCLI: ${cli}\nProject Path: ${projectPath}`
              }
            ]
          };
        }

        case 'create_page': {
          const { pagePath } = request.params.arguments as { pagePath: string };
          if (!this.config.projectPath) {
            throw new McpError(
              ErrorCode.ConfigurationError,
              'Project path not configured'
            );
          }

          const basePath = path.join(this.config.projectPath, pagePath);
          
          // 创建页面文件
          await this.createFileWithContent(
            `${basePath}.wxml`,
            '<view class="container">\n  <!-- 页面内容 -->\n</view>'
          );
          
          await this.createFileWithContent(
            `${basePath}.wxss`,
            '.container {\n  padding: 20px;\n}'
          );
          
          await this.createFileWithContent(
            `${basePath}.js`,
            'Page({\n  data: {\n  },\n  onLoad() {\n  }\n})'
          );
          
          await this.createFileWithContent(
            `${basePath}.json`,
            '{\n  "navigationBarTitleText": "新页面"\n}'
          );

          return {
            content: [
              {
                type: 'text',
                text: `Created page files at ${pagePath}`
              }
            ]
          };
        }

        case 'create_component': {
          const { componentPath } = request.params.arguments as { componentPath: string };
          if (!this.config.projectPath) {
            throw new McpError(
              ErrorCode.ConfigurationError,
              'Project path not configured'
            );
          }

          const basePath = path.join(this.config.projectPath, componentPath);
          
          // 创建组件文件
          await this.createFileWithContent(
            `${basePath}.wxml`,
            '<view class="component">\n  <!-- 组件内容 -->\n</view>'
          );
          
          await this.createFileWithContent(
            `${basePath}.wxss`,
            '.component {\n  /* 组件样式 */\n}'
          );
          
          await this.createFileWithContent(
            `${basePath}.js`,
            'Component({\n  properties: {\n  },\n  data: {\n  },\n  methods: {\n  }\n})'
          );
          
          await this.createFileWithContent(
            `${basePath}.json`,
            '{\n  "component": true\n}'
          );

          return {
            content: [
              {
                type: 'text',
                text: `Created component files at ${componentPath}`
              }
            ]
          };
        }

        case 'open_project': {
          if (!this.config.projectPath) {
            throw new McpError(
              ErrorCode.ConfigurationError,
              'Project path not configured'
            );
          }
          const { stdout } = await this.executeDevCommand(`open --project ${this.config.projectPath}`);
          return {
            content: [
              {
                type: 'text',
                text: `Opened project in WeChat DevTools\n${stdout}`
              }
            ]
          };
        }

        case 'build_npm': {
          if (!this.config.projectPath) {
            throw new McpError(
              ErrorCode.ConfigurationError,
              'Project path not configured'
            );
          }
          const { stdout } = await this.executeDevCommand(`build-npm --project ${this.config.projectPath}`);
          return {
            content: [
              {
                type: 'text',
                text: `Built npm packages\n${stdout}`
              }
            ]
          };
        }

        case 'preview': {
          if (!this.config.projectPath) {
            throw new McpError(
              ErrorCode.ConfigurationError,
              'Project path not configured'
            );
          }
          const { stdout } = await this.executeDevCommand(`preview --project ${this.config.projectPath}`);
          return {
            content: [
              {
                type: 'text',
                text: `Generated preview\n${stdout}`
              }
            ]
          };
        }

        case 'upload': {
          if (!this.config.projectPath) {
            throw new McpError(
              ErrorCode.ConfigurationError,
              'Project path not configured'
            );
          }
          const { version, desc } = request.params.arguments as { version: string; desc: string };
          const { stdout } = await this.executeDevCommand(
            `upload --project ${this.config.projectPath} -v ${version} -d "${desc}"`
          );
          return {
            content: [
              {
                type: 'text',
                text: `Uploaded version ${version}\n${stdout}`
              }
            ]
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('WeChat Mini Program MCP server running on stdio');
  }
}

const server = new WechatMiniappServer();
server.run().catch(console.error);