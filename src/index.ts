#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  McpError,
  ListToolsRequestSchema,
  ErrorCode, // 使用SDK提供的ErrorCode
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
  private config: WxConfig = {
    cli: process.env.WECHAT_CLI_PATH,
    projectPath: process.env.PROJECT_PATH
  };

  constructor() {
    this.server = new Server(
      {
        name: 'wechat-miniapp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
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
        ErrorCode.InvalidParams, // 使用SDK提供的错误码
        'WeChat DevTools CLI path not configured. Set WECHAT_CLI_PATH environment variable.'
      );
    }
    try {
      const { stdout, stderr } = await execAsync(`"${this.config.cli}" ${command}`);
      return { stdout, stderr };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError, // 使用SDK提供的错误码
        `Failed to execute command: ${error}`
      );
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'configure',
          description: 'Configure WeChat DevTools CLI path and project path',
          inputSchema: {
            type: 'object',
            properties: {
              cli: { type: 'string', description: 'WeChat DevTools CLI path' },
              projectPath: { type: 'string', description: 'MiniProgram project path' }
            }
          }
        },
        {
          name: 'create_page',
          description: 'Create WeChat MiniProgram page files',
          inputSchema: {
            type: 'object',
            properties: {
              pagePath: { type: 'string', description: 'Page path (e.g. pages/index)' }
            },
            required: ['pagePath']
          }
        },
        {
          name: 'create_component',
          description: 'Create WeChat MiniProgram component',
          inputSchema: {
            type: 'object',
            properties: {
              componentPath: { type: 'string', description: 'Component path (e.g. components/header)' }
            },
            required: ['componentPath']
          }
        },
        {
          name: 'open_project',
          description: 'Open project in WeChat DevTools',
          inputSchema: { type: 'object' }
        },
        {
          name: 'preview',
          description: 'Generate preview QR code',
          inputSchema: { type: 'object' }
        },
        {
          name: 'upload',
          description: 'Upload MiniProgram code',
          inputSchema: {
            type: 'object',
            properties: {
              version: { type: 'string', description: 'Version number' },
              desc: { type: 'string', description: 'Version description' }
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
            content: [{
              type: 'text',
              text: `Configuration updated:\nCLI: ${cli}\nProject: ${projectPath}`
            }]
          };
        }

        case 'create_page': {
          const { pagePath } = request.params.arguments as { pagePath: string };
          if (!this.config.projectPath) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Project path not configured'
            );
          }

          const basePath = path.join(this.config.projectPath, pagePath);
          
          await this.createFileWithContent(`${basePath}.wxml`, '<view class="container">\n  <!-- Your content -->\n</view>');
          await this.createFileWithContent(`${basePath}.wxss`, '.container {\n  padding: 20px;\n}');
          await this.createFileWithContent(`${basePath}.js`, 'Page({\n  data: {},\n  onLoad() {}\n})');
          await this.createFileWithContent(`${basePath}.json`, '{\n  "navigationBarTitleText": "New Page"\n}');

          return {
            content: [{
              type: 'text',
              text: `Created page at ${pagePath}`
            }]
          };
        }

        case 'create_component': {
          const { componentPath } = request.params.arguments as { componentPath: string };
          if (!this.config.projectPath) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Project path not configured'
            );
          }

          const basePath = path.join(this.config.projectPath, componentPath);
          
          await this.createFileWithContent(`${basePath}.wxml`, '<view class="component">\n  <!-- Component content -->\n</view>');
          await this.createFileWithContent(`${basePath}.wxss`, '.component {\n  /* Component styles */\n}');
          await this.createFileWithContent(`${basePath}.js`, 'Component({\n  properties: {},\n  data: {},\n  methods: {}\n})');
          await this.createFileWithContent(`${basePath}.json`, '{\n  "component": true\n}');

          return {
            content: [{
              type: 'text',
              text: `Created component at ${componentPath}`
            }]
          };
        }

        case 'open_project': {
          if (!this.config.projectPath) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Project path not configured'
            );
          }
          const { stdout } = await this.executeDevCommand(`open --project "${this.config.projectPath}"`);
          return {
            content: [{
              type: 'text',
              text: `Opened project in WeChat DevTools\n${stdout}`
            }]
          };
        }

        case 'preview': {
          if (!this.config.projectPath) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Project path not configured'
            );
          }
          const { stdout } = await this.executeDevCommand(`preview --project "${this.config.projectPath}"`);
          return {
            content: [{
              type: 'text',
              text: `Generated preview QR code\n${stdout}`
            }]
          };
        }

        case 'upload': {
          if (!this.config.projectPath) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Project path not configured'
            );
          }
          const { version, desc } = request.params.arguments as { version: string; desc: string };
          const { stdout } = await this.executeDevCommand(
            `upload --project "${this.config.projectPath}" -v ${version} -d "${desc}"`
          );
          return {
            content: [{
              type: 'text',
              text: `Uploaded version ${version}\n${stdout}`
            }]
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
    console.error('WeChat MiniProgram MCP server running');
  }
}

const server = new WechatMiniappServer();
server.run().catch(console.error);