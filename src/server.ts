import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YuqueService } from "./services/yuque";
import express, { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { IncomingMessage, ServerResponse } from "http";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export const Logger = {
  log: (...args: any[]) => {},
  error: (...args: any[]) => {},
};

export class YuqueMcpServer {
  private readonly server: McpServer;
  private sseTransport: SSEServerTransport | null = null;
  private yuqueApiToken: string;
  private yuqueApiBaseUrl: string;

  constructor(yuqueApiToken: string, yuqueApiBaseUrl: string) {
    this.yuqueApiToken = yuqueApiToken;
    this.yuqueApiBaseUrl = yuqueApiBaseUrl;
    this.server = new McpServer(
      {
        name: "Yuque MCP Server",
        version: "0.1.0",
      },
      {
        capabilities: {
          logging: {},
          tools: {},
        },
      },
    );

    this.registerTools();
  }

  // 创建新的YuqueService实例的辅助方法
  private createYuqueService(): YuqueService {
    return new YuqueService(this.yuqueApiToken, this.yuqueApiBaseUrl);
  }

  // 将长文档内容分割成较小的块
  private splitDocumentContent(doc: any, chunkSize: number = 100000): any[] {
    // 先将整个文档对象转换为格式化的JSON字符串
    const fullDocString = JSON.stringify(doc, null, 2);
    console.log("fullDocString length: "+ fullDocString.length);
    
    // 如果整个文档字符串长度小于块大小，直接返回原文档
    if (fullDocString.length <= chunkSize) {
      return [doc];
    }
    
    // 使用简单的文本分割逻辑，添加重叠内容
    const overlapSize = 200; // 块之间的重叠大小
    const chunks: string[] = [];
    
    // 直接按照固定大小分割，不考虑内容边界
    let startIndex = 0;
    while (startIndex < fullDocString.length) {
      // 计算当前块的结束位置
      const endIndex = Math.min(startIndex + chunkSize, fullDocString.length);
      
      // 提取当前块内容
      chunks.push(fullDocString.substring(startIndex, endIndex));
      
      // 更新下一个块的起始位置，确保有重叠
      startIndex = endIndex - overlapSize;
      
      // 如果已经到达文本末尾或下一次循环会导致无效分块，则退出循环
      if (startIndex >= fullDocString.length - overlapSize) {
        break;
      }
    }
    
    // 为每个块创建对应的文档对象，添加分块和上下文信息
    return chunks.map((chunk, index) => {
      // 创建一个返回对象
      const result: any = {
        _original_doc_id: doc.id,
        _original_title: doc.title,
        _chunk_info: {
          index: index,
          total: chunks.length,
          is_chunked: true,
          chunk_size: chunkSize,
          overlap_size: overlapSize,
          content_type: 'full_doc_json',
          // 添加上下文信息
          context: {
            has_previous: index > 0,
            has_next: index < chunks.length - 1,
            // 添加提示，指出这是部分内容
            note: index > 0 ? "此内容包含与前一块重叠的部分" : ""
          }
        }
      };
      
      // 保存原始文本块
      result.text_content = chunk;
      
      // 尝试将文本块解析回JSON（如果是完整的JSON对象）
      try {
        // 仅当文本以 { 开头且以 } 结尾时尝试解析
        if (chunk.trim().startsWith('{') && chunk.trim().endsWith('}')) {
          const parsedChunk = JSON.parse(chunk);
          
          // 合并解析后的属性到结果对象
          Object.assign(result, parsedChunk);
        }
      } catch (e) {
        // 解析失败，保留文本格式
        result.parse_error = "块内容不是完整的JSON对象，保留为文本";
      }
      
      // 修改标题，添加分块标记
      result.title = `${doc.title} [部分 ${index + 1}/${chunks.length}]`;
      
      return result;
    });
  }

  private registerTools(): void {
    // Tool to get current user information
    this.server.tool(
      "get_current_user",
      "获取当前认证用户的信息，包括用户ID、用户名、头像等语雀账号基本信息",
      {},
      async () => {
        try {
          Logger.log("Fetching current user information");
          const yuqueService = this.createYuqueService();
          const user = await yuqueService.getCurrentUser();
          
          Logger.log(`Successfully fetched user: ${user.name}`);
          Logger.log(JSON.stringify(user) );
          return {
            content: [{ type: "text", text: JSON.stringify(user) }],
          };
        } catch (error) {
          Logger.error("Error fetching current user:", error);
          return {
            content: [{ type: "text", text: `Error fetching current user: ${error}` }],
          };
        }
      },
    );

    // Tool to get user's docs
    this.server.tool(
      "get_user_docs",
      "获取当前用户的所有知识库文档列表，包括私人和协作文档",
      {},
      async () => {
        try {
          Logger.log("Fetching user's documents");
          const yuqueService = this.createYuqueService();
          const docs = await yuqueService.getUserDocs();
          
          Logger.log(`Successfully fetched ${docs.length} documents`);
          return {
            content: [{ type: "text", text: JSON.stringify(docs) }],
          };
        } catch (error) {
          Logger.error("Error fetching user docs:", error);
          return {
            content: [{ type: "text", text: `Error fetching user docs: ${error}` }],
          };
        }
      },
    );

    // Tool to get user's repos
    this.server.tool(
      "get_user_repos",
      "获取指定用户的知识库列表，知识库是语雀中组织文档的集合",
      {
        login: z.string().describe("用户的登录名或唯一标识"),
      },
      async ({ login }) => {
        try {
          Logger.log(`Fetching repositories for user: ${login}`);
          const yuqueService = this.createYuqueService();
          const repos = await yuqueService.getUserRepos(login);
          
          Logger.log(`Successfully fetched ${repos.length} repositories`);
          return {
            content: [{ type: "text", text: JSON.stringify(repos, null, 2) }],
          };
        } catch (error) {
          Logger.error(`Error fetching repos for user ${login}:`, error);
          return {
            content: [{ type: "text", text: `Error fetching repos: ${error}` }],
          };
        }
      },
    );

    // Tool to get docs in a repo
    this.server.tool(
      "get_repo_docs",
      "获取特定知识库中的所有文档列表，包括文档标题、更新时间等信息",
      {
        namespace: z.string().describe("知识库的命名空间，格式为 user/repo"),
      },
      async ({ namespace }) => {
        try {
          Logger.log(`Fetching documents for repository: ${namespace}`);
          const yuqueService = this.createYuqueService();
          const docs = await yuqueService.getRepoDocs(namespace);
          
          Logger.log(`Successfully fetched ${docs.length} documents`);
          return {
            content: [{ type: "text", text: JSON.stringify(docs, null, 2) }],
          };
        } catch (error) {
          Logger.error(`Error fetching docs for repo ${namespace}:`, error);
          return {
            content: [{ type: "text", text: `Error fetching docs: ${error}` }],
          };
        }
      },
    );

    // Tool to get a specific document
    this.server.tool(
      "get_doc",
      "获取语雀中特定文档的详细内容，包括正文、修改历史和权限信息（支持分块处理大型文档）",
      {
        namespace: z.string().describe("知识库的命名空间，格式为 user/repo"),
        slug: z.string().describe("文档的唯一标识或短链接名称"),
        chunk_index: z.number().optional().describe("要获取的文档块索引，不提供则返回第一块或全部（如果内容较小）"),
        chunk_size: z.number().optional().describe("分块大小（字符数），默认为100000"),
      },
      async ({ namespace, slug, chunk_index, chunk_size = 100000 }) => {
        try {
          Logger.log(`Fetching document ${slug} from repository: ${namespace}`);
          const yuqueService = this.createYuqueService();
          const doc = await yuqueService.getDoc(namespace, slug);
          
          Logger.log(`Successfully fetched document: ${doc.title}, content length: ${doc.body?.length || 0} chars`);
          
          // 将文档内容分割成块
          const docChunks = this.splitDocumentContent(doc, chunk_size);
          
          if (docChunks.length > 1) {
            Logger.log(`Document has been split into ${docChunks.length} chunks`);
            
            // 如果没有指定块索引，默认返回第一块
            if (chunk_index === undefined) {
              // 返回第一块的同时提供分块信息
              const firstChunk = docChunks[0];
              Logger.log(`Returning first chunk (1/${docChunks.length})`);
              return {
                content: [{ type: "text", text: JSON.stringify(firstChunk, null, 2) }],
              };
            }
            
            // 如果指定了块索引，检查有效性
            if (chunk_index < 0 || chunk_index >= docChunks.length) {
              const error = `Invalid chunk_index: ${chunk_index}. Valid range is 0-${docChunks.length - 1}`;
              Logger.error(error);
              return {
                content: [{ type: "text", text: error }],
              };
            }
            
            // 返回指定的块
            Logger.log(`Returning chunk ${chunk_index + 1}/${docChunks.length}`);
            return {
              content: [{ type: "text", text: JSON.stringify(docChunks[chunk_index], null, 2) }],
            };
          } else {
            // 如果文档很小，不需要分块，直接返回完整文档
            Logger.log(`Document is small enough, no chunking needed`);
            return {
              content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
            };
          }
        } catch (error) {
          Logger.error(`Error fetching doc ${slug} from repo ${namespace}:`, error);
          return {
            content: [{ type: "text", text: `Error fetching doc: ${error}` }],
          };
        }
      },
    );

    // Tool to create a new document
    this.server.tool(
      "create_doc",
      "在指定知识库中创建新的语雀文档，支持多种格式内容",
      {
        namespace: z.string().describe("知识库的命名空间，格式为 user/repo"),
        title: z.string().describe("文档标题"),
        slug: z.string().describe("文档的短链接名称，用于URL路径"),
        body: z.string().describe("文档内容，支持Markdown格式"),
        format: z.string().optional().describe("内容格式，可选值：markdown、html、lake，默认为 markdown"),
        public_level: z.number().optional().describe("公开性，可选值：0(私密)、1(公开)、2(企业内公开)，默认为 1"),
      },
      async ({ namespace, title, slug, body, format = 'markdown', public_level = 1 }) => {
        try {
          Logger.log(`Creating document "${title}" in repository: ${namespace}`);
          const yuqueService = this.createYuqueService();
          const doc = await yuqueService.createDoc(namespace, title, slug, body, format, public_level);
          
          Logger.log(`Successfully created document: ${doc.title}`);
          return {
            content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
          };
        } catch (error) {
          Logger.error(`Error creating doc in repo ${namespace}:`, error);
          return {
            content: [{ type: "text", text: `Error creating doc: ${error}` }],
          };
        }
      },
    );

    // Tool to update a document
    this.server.tool(
      "update_doc",
      "更新语雀中已存在的文档，可以修改标题、内容或权限设置",
      {
        namespace: z.string().describe("知识库的命名空间，格式为 user/repo"),
        id: z.number().describe("要更新的文档ID"),
        title: z.string().optional().describe("文档的新标题"),
        slug: z.string().optional().describe("文档的新短链接名称"),
        body: z.string().optional().describe("文档的新内容，支持Markdown格式"),
        public: z.number().optional().describe("文档的公开状态，0(私密)、1(公开)、2(企业内公开)"),
        format: z.string().optional().describe("内容格式，可选值：markdown、html、lake"),
      },
      async ({ namespace, id, title, slug, body, public: publicLevel, format }) => {
        try {
          Logger.log(`Updating document ${id} in repository: ${namespace}`);
          const yuqueService = this.createYuqueService();
          const updateData: any = {};
          if (title !== undefined) updateData.title = title;
          if (slug !== undefined) updateData.slug = slug;
          if (body !== undefined) updateData.body = body;
          if (publicLevel !== undefined) updateData.public = publicLevel;
          if (format !== undefined) updateData.format = format;
          
          const doc = await yuqueService.updateDoc(namespace, id, updateData);
          
          Logger.log(`Successfully updated document: ${doc.title}`);
          return {
            content: [{ type: "text", text: JSON.stringify(doc, null, 2) }],
          };
        } catch (error) {
          Logger.error(`Error updating doc ${id} in repo ${namespace}:`, error);
          return {
            content: [{ type: "text", text: `Error updating doc: ${error}` }],
          };
        }
      },
    );

    // Tool to delete a document
    this.server.tool(
      "delete_doc",
      "从语雀知识库中删除指定文档，此操作不可撤销",
      {
        namespace: z.string().describe("知识库的命名空间，格式为 user/repo"),
        id: z.number().describe("要删除的文档ID"),
      },
      async ({ namespace, id }) => {
        try {
          Logger.log(`Deleting document ${id} from repository: ${namespace}`);
          const yuqueService = this.createYuqueService();
          await yuqueService.deleteDoc(namespace, id);
          
          Logger.log(`Successfully deleted document ${id}`);
          return {
            content: [{ type: "text", text: `Document ${id} has been successfully deleted` }],
          };
        } catch (error) {
          Logger.error(`Error deleting doc ${id} from repo ${namespace}:`, error);
          return {
            content: [{ type: "text", text: `Error deleting doc: ${error}` }],
          };
        }
      },
    );

    // Tool to search Yuque content
    this.server.tool(
      "search",
      "在语雀平台中搜索文档或知识库内容，支持范围和作者筛选",
      {
        query: z.string().describe("搜索关键词"),
        type: z.enum(['doc', 'repo']).describe("要搜索的内容类型：doc(文档) 或 repo(知识库)"),
        scope: z.string().optional().describe("搜索范围，不填默认搜索当前用户/团队"),
        page: z.number().optional().describe("页码，默认为1"),
        creator: z.string().optional().describe("仅搜索指定作者的内容"),
      },
      async ({ query, type, scope, page, creator }) => {
        try {
          Logger.log(`Searching for: ${query} with type: ${type}`);
          const yuqueService = this.createYuqueService();
          const results = await yuqueService.search(query, type, scope, page, creator);
          
          Logger.log(`Successfully found ${results.length} results`);
          return {
            content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
          };
        } catch (error) {
          Logger.error(`Error searching for ${query}:`, error);
          return {
            content: [{ type: "text", text: `Error searching: ${error}` }],
          };
        }
      },
    );

    // 团队统计汇总数据
    this.server.tool(
      "get_group_statistics",
      "获取团队的汇总统计数据，包括成员人数、文档数量、阅读量和互动数据等",
      {
        login: z.string().describe("团队的登录名或唯一标识"),
      },
      async ({ login }) => {
        try {
          Logger.log(`Fetching statistics for group: ${login}`);
          const yuqueService = this.createYuqueService();
          const stats = await yuqueService.getGroupStatistics(login);
          
          Logger.log(`Successfully fetched statistics for group: ${login}`);
          return {
            content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
          };
        } catch (error) {
          Logger.error(`Error fetching statistics for group ${login}:`, error);
          return {
            content: [{ type: "text", text: `Error fetching group statistics: ${error}` }],
          };
        }
      },
    );

    // 团队成员统计数据
    this.server.tool(
      "get_group_member_statistics",
      "获取团队成员的统计数据，包括各成员的编辑次数、阅读量、点赞量等",
      {
        login: z.string().describe("团队的登录名或唯一标识"),
        name: z.string().optional().describe("成员名称，用于过滤特定成员"),
        range: z.number().optional().describe("时间范围（0: 全部, 30: 近30天, 365: 近一年）"),
        page: z.number().optional().describe("页码，默认为1"),
        limit: z.number().optional().describe("每页数量，默认为10，最大为20"),
        sortField: z.string().optional().describe("排序字段，可选值：write_doc_count、write_count、read_count、like_count"),
        sortOrder: z.enum(['desc', 'asc']).optional().describe("排序方向，可选值：desc（降序）、asc（升序），默认为desc"),
      },
      async (params) => {
        try {
          const { login, ...queryParams } = params;
          Logger.log(`Fetching member statistics for group: ${login}`);
          const yuqueService = this.createYuqueService();
          const stats = await yuqueService.getGroupMemberStatistics(login, queryParams);
          
          Logger.log(`Successfully fetched member statistics for group: ${login}`);
          return {
            content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
          };
        } catch (error) {
          Logger.error(`Error fetching member statistics for group ${params.login}:`, error);
          return {
            content: [{ type: "text", text: `Error fetching group member statistics: ${error}` }],
          };
        }
      },
    );

    // 团队知识库统计数据
    this.server.tool(
      "get_group_book_statistics",
      "获取团队知识库的统计数据，包括各知识库的文档数、字数、阅读量等",
      {
        login: z.string().describe("团队的登录名或唯一标识"),
        name: z.string().optional().describe("知识库名称，用于过滤特定知识库"),
        range: z.number().optional().describe("时间范围（0: 全部, 30: 近30天, 365: 近一年）"),
        page: z.number().optional().describe("页码，默认为1"),
        limit: z.number().optional().describe("每页数量，默认为10，最大为20"),
        sortField: z.string().optional().describe("排序字段，可选值：content_updated_at_ms、word_count、post_count、read_count、like_count、watch_count、comment_count"),
        sortOrder: z.enum(['desc', 'asc']).optional().describe("排序方向，可选值：desc（降序）、asc（升序），默认为desc"),
      },
      async (params) => {
        try {
          const { login, ...queryParams } = params;
          Logger.log(`Fetching book statistics for group: ${login}`);
          const yuqueService = this.createYuqueService();
          const stats = await yuqueService.getGroupBookStatistics(login, queryParams);
          
          Logger.log(`Successfully fetched book statistics for group: ${login}`);
          return {
            content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
          };
        } catch (error) {
          Logger.error(`Error fetching book statistics for group ${params.login}:`, error);
          return {
            content: [{ type: "text", text: `Error fetching group book statistics: ${error}` }],
          };
        }
      },
    );

    // 团队文档统计数据
    this.server.tool(
      "get_group_doc_statistics",
      "获取团队文档的统计数据，包括各文档的字数、阅读量、评论量等",
      {
        login: z.string().describe("团队的登录名或唯一标识"),
        bookId: z.number().optional().describe("知识库ID，用于过滤特定知识库的文档"),
        name: z.string().optional().describe("文档名称，用于过滤特定文档"),
        range: z.number().optional().describe("时间范围（0: 全部, 30: 近30天, 365: 近一年）"),
        page: z.number().optional().describe("页码，默认为1"),
        limit: z.number().optional().describe("每页数量，默认为10，最大为20"),
        sortField: z.string().optional().describe("排序字段，可选值：content_updated_at、word_count、read_count、like_count、comment_count、created_at"),
        sortOrder: z.enum(['desc', 'asc']).optional().describe("排序方向，可选值：desc（降序）、asc（升序），默认为desc"),
      },
      async (params) => {
        try {
          const { login, ...queryParams } = params;
          Logger.log(`Fetching doc statistics for group: ${login}`);
          const yuqueService = this.createYuqueService();
          const stats = await yuqueService.getGroupDocStatistics(login, queryParams);
          
          Logger.log(`Successfully fetched doc statistics for group: ${login}`);
          return {
            content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
          };
        } catch (error) {
          Logger.error(`Error fetching doc statistics for group ${params.login}:`, error);
          return {
            content: [{ type: "text", text: `Error fetching group doc statistics: ${error}` }],
          };
        }
      },
    );

    // 获取文档分块元信息
    this.server.tool(
      "get_doc_chunks_info",
      "获取文档的分块元信息，包括总块数、每块的字符数等",
      {
        namespace: z.string().describe("知识库的命名空间，格式为 user/repo"),
        slug: z.string().describe("文档的唯一标识或短链接名称"),
        chunk_size: z.number().optional().describe("分块大小（字符数），默认为100000"),
      },
      async ({ namespace, slug, chunk_size = 100000 }) => {
        try {
          Logger.log(`Fetching document chunk info for ${slug} from repository: ${namespace}`);
          const yuqueService = this.createYuqueService();
          const doc = await yuqueService.getDoc(namespace, slug);
          
          // 将整个文档转换为JSON字符串来评估总长度
          const fullDocString = JSON.stringify(doc, null, 2);
          
          // 计算会产生多少块
          const overlapSize = 200;
          let totalChunks = 1;
          
          if (fullDocString.length > chunk_size) {
            // 简单计算分块数量，考虑重叠
            // 公式：向上取整((总长度 - 重叠大小) / (块大小 - 重叠大小))
            totalChunks = Math.ceil((fullDocString.length - overlapSize) / (chunk_size - overlapSize));
          }
          
          // 构建分块元信息对象
          const chunksInfo = {
            document_id: doc.id,
            title: doc.title,
            total_chunks: totalChunks,
            total_length: fullDocString.length,
            chunk_size: chunk_size,
            overlap_size: overlapSize,
            estimated_chunks: Array.from({ length: totalChunks }, (_, index) => {
              // 估计每个块的起始和结束位置
              const startPosition = index === 0 ? 0 : (index * (chunk_size - overlapSize));
              const endPosition = Math.min(startPosition + chunk_size, fullDocString.length);
              
              return {
                index: index,
                title: `${doc.title} [部分 ${index + 1}/${totalChunks}]`,
                approximate_start: startPosition,
                approximate_end: endPosition,
                approximate_length: endPosition - startPosition,
                how_to_get: `使用 get_doc 工具，指定 chunk_index=${index}`
              };
            })
          };
          
          Logger.log(`Document would be split into ${totalChunks} chunks with size ${chunk_size}`);
          return {
            content: [{ type: "text", text: JSON.stringify(chunksInfo, null, 2) }],
          };
        } catch (error) {
          Logger.error(`Error fetching doc chunks info for ${slug} from repo ${namespace}:`, error);
          return {
            content: [{ type: "text", text: `Error fetching doc chunks info: ${error}` }],
          };
        }
      },
    );
  }

  async connect(transport: Transport): Promise<void> {
    await this.server.connect(transport);

    Logger.log = (...args: any[]) => {
      this.server.server.sendLoggingMessage({
        level: "info",
        data: args,
      });
    };
    
    Logger.error = (...args: any[]) => {
      this.server.server.sendLoggingMessage({
        level: "error",
        data: args,
      });
    };

    Logger.log("Yuque MCP Server connected and ready to process requests");
  }

  // Display available tools to the console
  displayAvailableTools(): void {
    // 手动定义工具列表，因为我们不能直接访问 server.tools
    const tools = [
      { name: "get_current_user", description: "获取当前认证用户的信息，包括用户ID、用户名、头像等语雀账号基本信息" },
      { name: "get_user_docs", description: "获取当前用户的所有知识库文档列表，包括私人和协作文档" },
      { name: "get_user_repos", description: "获取指定用户的知识库列表，知识库是语雀中组织文档的集合" },
      { name: "get_repo_docs", description: "获取特定知识库中的所有文档列表，包括文档标题、更新时间等信息" },
      { name: "get_doc", description: "获取语雀中特定文档的详细内容，包括正文、修改历史和权限信息（支持分块处理大型文档）" },
      { name: "get_doc_chunks_info", description: "获取文档的分块元信息，包括总块数、每块的字符数等" },
      { name: "create_doc", description: "在指定知识库中创建新的语雀文档，支持多种格式内容" },
      { name: "update_doc", description: "更新语雀中已存在的文档，可以修改标题、内容或权限设置" },
      { name: "delete_doc", description: "从语雀知识库中删除指定文档，此操作不可撤销" },
      { name: "search", description: "在语雀平台中搜索文档或知识库内容，支持范围和作者筛选" },
      { name: "get_group_statistics", description: "获取团队的汇总统计数据，包括成员人数、文档数量、阅读量和互动数据等" },
      { name: "get_group_member_statistics", description: "获取团队成员的统计数据，包括各成员的编辑次数、阅读量、点赞量等" },
      { name: "get_group_book_statistics", description: "获取团队知识库的统计数据，包括各知识库的文档数、字数、阅读量等" },
      { name: "get_group_doc_statistics", description: "获取团队文档的统计数据，包括各文档的字数、阅读量、评论量等" }
    ];
    
    console.log('\n======== 语雀 MCP 服务器可用工具 ========');
    console.log('以下工具可用于与语雀知识库交互：');
    console.log('----------------------------------------');
    
    tools.forEach(tool => {
      console.log(`\n• ${tool.name}`);
      console.log(`  ${tool.description}`);
    });
    
    console.log('\n========================================\n');
  }

  async startHttpServer(port: number): Promise<void> {
    const app = express();
    
    // 添加健康检查端点
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        version: '0.1.0',
        timestamp: new Date().toISOString()
      });
    });

    app.get("/sse", async (req: Request, res: Response) => {
      console.log("New SSE connection established");
      
      // 获取 query 参数中的 accessToken 和 baseUrl
      const queryAccessToken = req.query.accessToken as string | undefined;
      const queryBaseUrl = req.query.baseUrl as string | undefined;
      
      // 如果提供了 query 参数，更新配置
      if (queryAccessToken || queryBaseUrl) {
        console.log(`Using custom configuration: ${queryAccessToken ? 'Token from query, ' : ''}${queryBaseUrl ? 'BaseUrl from query' : ''}`);
        
        // 更新配置属性
        if (queryAccessToken) {
          this.yuqueApiToken = queryAccessToken;
        }
        if (queryBaseUrl) {
          this.yuqueApiBaseUrl = queryBaseUrl;
        }
      }
      
      this.sseTransport = new SSEServerTransport(
        "/messages",
        res as unknown as ServerResponse<IncomingMessage>,
      );
      await this.server.connect(this.sseTransport);
    });

    app.post("/messages", async (req: Request, res: Response) => {
      if (!this.sseTransport) {
        res.status(400).send("SSE connection not established");
        return;
      }
      await this.sseTransport.handlePostMessage(
        req as unknown as IncomingMessage,
        res as unknown as ServerResponse<IncomingMessage>,
      );
    });

    Logger.log = console.log;
    Logger.error = console.error;

    app.listen(port, () => {
      Logger.log(`Yuque MCP HTTP server listening on port ${port}`);
      Logger.log(`SSE endpoint available at http://localhost:${port}/sse`);
      Logger.log(`Message endpoint available at http://localhost:${port}/messages`);
      
      // Display available tools
      this.displayAvailableTools();
    });
  }
}