import axios, { AxiosInstance } from 'axios';

export interface YuqueUser {
  id: number;
  type?: string;
  login: string;
  name: string;
  description: string;
  avatar_url: string;
  books_count?: number;
  public_books_count?: number;
  followers_count?: number;
  following_count?: number;
  public?: number;
  created_at: string;
  updated_at: string;
}

export interface YuqueGroup {
  id: number;
  type?: string;
  login: string;
  name: string;
  description: string;
  avatar_url: string;
  books_count?: number;
  public_books_count?: number;
  members_count?: number;
  public?: number;
  created_at: string;
  updated_at: string;
}

export interface YuqueGroupUser {
  id: number;
  group_id: number;
  user_id: number;
  role: number;
  created_at: string;
  updated_at: string;
  group?: YuqueGroup;
  user?: YuqueUser;
}

export interface YuqueDoc {
  id: number;
  slug: string;
  title: string;
  description: string;
  user_id: number;
  book_id: number;
  format: string;
  public: number;
  status: number;
  likes_count: number;
  read_count?: number;
  comments_count: number;
  content_updated_at: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  first_published_at?: string;
  word_count: number;
  body?: string;
  body_html?: string;
  body_lake?: string;
  body_draft?: string;
  book?: YuqueRepo;
  user?: YuqueUser;
  last_editor?: YuqueUser;
  creator?: YuqueUser;
}

export interface YuqueRepo {
  id: number;
  type: string;
  slug: string;
  name: string;
  user_id: number;
  description: string;
  public: number;
  items_count: number;
  likes_count: number;
  watches_count: number;
  content_updated_at: string;
  created_at: string;
  updated_at: string;
  namespace: string;
  user?: YuqueUser;
  toc_yml?: string;
}

export interface YuqueDocVersion {
  id: number;
  doc_id: number;
  slug: string;
  title: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  user?: YuqueUser;
}

export interface YuqueDocVersionDetail extends YuqueDocVersion {
  format: string;
  body: string;
  body_html?: string;
  body_asl?: string;
  diff?: string;
}

export interface YuqueTocItem {
  uuid: string;
  type: 'DOC' | 'LINK' | 'TITLE';
  title: string;
  url?: string;
  doc_id?: number;
  level: number;
  open_window?: number;
  visible: number;
  prev_uuid?: string;
  sibling_uuid?: string;
  child_uuid?: string;
  parent_uuid?: string;
}

export interface YuqueSearchResult {
  id: number;
  type: 'doc' | 'repo';
  title: string;
  summary: string;
  url: string;
  info: string;
  target: YuqueDoc | YuqueRepo;
}

export interface YuqueTag {
  id: number;
  title: string;
  doc_id: number;
  book_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export class YuqueService {
  private client!: AxiosInstance;
  private baseURL: string;
  private apiToken: string;

  constructor(apiToken: string = '', baseURL: string = 'https://www.yuque.com/api/v2') {
    this.apiToken = apiToken;
    this.baseURL = baseURL;
    this.initClient();
  }

  // 初始化客户端
  private initClient() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // 只有当 token 不为空时才添加到请求头
    if (this.apiToken) {
      headers['X-Auth-Token'] = this.apiToken;
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers,
    });
  }

  // Getter methods for token and baseURL
  getApiToken(): string {
    return this.apiToken;
  }

  getBaseUrl(): string {
    return this.baseURL;
  }
  
  // 更新 API Token
  updateApiToken(newToken: string): void {
    this.apiToken = newToken;
    this.initClient();
  }
  
  // 更新 Base URL
  updateBaseUrl(newBaseUrl: string): void {
    this.baseURL = newBaseUrl;
    this.initClient();
  }
  
  // 同时更新 Token 和 Base URL
  updateConfig(newToken?: string, newBaseUrl?: string): void {
    if (newToken) {
      this.apiToken = newToken;
    }
    if (newBaseUrl) {
      this.baseURL = newBaseUrl;
    }
    this.initClient();
  }

  // 心跳检测
  async hello(): Promise<{ message: string }> {
    const response = await this.client.get('/hello');
    return response.data.data;
  }

  // User endpoints
  async getCurrentUser(): Promise<YuqueUser> {
    const response = await this.client.get('/user');
    return response.data.data;
  }

  async getUserDocs(): Promise<YuqueDoc[]> {
    const response = await this.client.get('/user/docs');
    return response.data.data;
  }

  // 获取用户的团队
  async getUserGroups(id: string, role?: number, offset?: number): Promise<YuqueGroup[]> {
    const params: any = {};
    if (role !== undefined) params.role = role;
    if (offset !== undefined) params.offset = offset;
    
    const response = await this.client.get(`/users/${id}/groups`, { params });
    return response.data.data;
  }

  // Group endpoints
  async getGroupMembers(login: string, role?: number, offset?: number): Promise<YuqueGroupUser[]> {
    const params: any = {};
    if (role !== undefined) params.role = role;
    if (offset !== undefined) params.offset = offset;
    
    const response = await this.client.get(`/groups/${login}/users`, { params });
    return response.data.data;
  }

  async updateGroupMember(login: string, id: string, role: number): Promise<YuqueGroupUser> {
    const response = await this.client.put(`/groups/${login}/users/${id}`, { role });
    return response.data.data;
  }

  async deleteGroupMember(login: string, id: string): Promise<{ user_id: string }> {
    const response = await this.client.delete(`/groups/${login}/users/${id}`);
    return response.data.data;
  }

  // Repo endpoints
  async getUserRepos(login: string, offset?: number, limit?: number, type?: string): Promise<YuqueRepo[]> {
    const params: any = {};
    if (offset !== undefined) params.offset = offset;
    if (limit !== undefined) params.limit = limit;
    if (type !== undefined) params.type = type;
    
    const response = await this.client.get(`/users/${login}/repos`, { params });
    return response.data.data;
  }

  async getGroupRepos(login: string, offset?: number, limit?: number, type?: string): Promise<YuqueRepo[]> {
    const params: any = {};
    if (offset !== undefined) params.offset = offset;
    if (limit !== undefined) params.limit = limit;
    if (type !== undefined) params.type = type;
    
    const response = await this.client.get(`/groups/${login}/repos`, { params });
    return response.data.data;
  }

  async getRepo(namespace: string): Promise<YuqueRepo> {
    const response = await this.client.get(`/repos/${namespace}`);
    return response.data.data;
  }

  async createRepo(login: string, name: string, slug: string, description?: string, public_level: number = 0, enhancedPrivacy?: boolean): Promise<YuqueRepo> {
    const data: any = {
      name,
      slug,
      public: public_level
    };
    
    if (description !== undefined) data.description = description;
    if (enhancedPrivacy !== undefined) data.enhancedPrivacy = enhancedPrivacy;
    
    const response = await this.client.post(`/users/${login}/repos`, data);
    return response.data.data;
  }

  async createGroupRepo(login: string, name: string, slug: string, description?: string, public_level: number = 0, enhancedPrivacy?: boolean): Promise<YuqueRepo> {
    const data: any = {
      name,
      slug,
      public: public_level
    };
    
    if (description !== undefined) data.description = description;
    if (enhancedPrivacy !== undefined) data.enhancedPrivacy = enhancedPrivacy;
    
    const response = await this.client.post(`/groups/${login}/repos`, data);
    return response.data.data;
  }

  async updateRepo(namespace: string, data: {
    name?: string;
    slug?: string;
    description?: string;
    public?: number;
    toc?: string;
  }): Promise<YuqueRepo> {
    const response = await this.client.put(`/repos/${namespace}`, data);
    return response.data.data;
  }

  async deleteRepo(namespace: string): Promise<YuqueRepo> {
    const response = await this.client.delete(`/repos/${namespace}`);
    return response.data.data;
  }

  // Document endpoints
  async getRepoDocs(namespace: string, offset?: number, limit?: number, optional_properties?: string): Promise<YuqueDoc[]> {
    const params: any = {};
    if (offset !== undefined) params.offset = offset;
    if (limit !== undefined) params.limit = limit;
    if (optional_properties !== undefined) params.optional_properties = optional_properties;
    
    const response = await this.client.get(`/repos/${namespace}/docs`, { params });
    return response.data.data;
  }

  async getDoc(namespace: string, slug: string, page?: number, page_size?: number): Promise<YuqueDoc> {
    const params: any = {};
    if (page !== undefined) params.page = page;
    if (page_size !== undefined) params.page_size = page_size;
    
    const response = await this.client.get(`/repos/${namespace}/docs/${slug}`, { params });
    // filter body_lake body_draft 
    // 过滤不需要的原始格式内容
    if (response.data.data.body_lake) delete response.data.data.body_lake;
    if (response.data.data.body_draft) delete response.data.data.body_draft;
    if (response.data.data.body_html) delete response.data.data.body_html;
    return response.data.data;
  }

  async createDoc(
    namespace: string,
    title: string,
    slug: string,
    body: string,
    format: string = 'markdown',
    public_level: number = 1
  ): Promise<YuqueDoc> {
    const response = await this.client.post(`/repos/${namespace}/docs`, {
      title,
      slug,
      public: public_level,
      format,
      body,
    });
    return response.data.data;
  }

  async updateDoc(
    namespace: string,
    id: number,
    data: {
      title?: string;
      slug?: string;
      body?: string;
      public?: number;
      format?: string;
    }
  ): Promise<YuqueDoc> {
    const response = await this.client.put(`/repos/${namespace}/docs/${id}`, data);
    return response.data.data;
  }

  async deleteDoc(namespace: string, id: number): Promise<YuqueDoc> {
    const response = await this.client.delete(`/repos/${namespace}/docs/${id}`);
    return response.data.data;
  }

  // 文档版本管理
  async getDocVersions(doc_id: number): Promise<YuqueDocVersion[]> {
    const response = await this.client.get('/doc_versions', { params: { doc_id } });
    return response.data.data;
  }

  async getDocVersion(id: number): Promise<YuqueDocVersionDetail> {
    const response = await this.client.get(`/doc_versions/${id}`);
    return response.data.data;
  }

  // TOC (目录) 管理
  async getRepoToc(namespace: string): Promise<YuqueTocItem[]> {
    const response = await this.client.get(`/repos/${namespace}/toc`);
    return response.data.data;
  }

  async updateRepoToc(namespace: string, data: {
    action: 'appendNode' | 'prependNode' | 'editNode' | 'removeNode';
    action_mode: 'sibling' | 'child';
    target_uuid?: string;
    node_uuid?: string;
    doc_ids?: number[];
    type?: 'DOC' | 'LINK' | 'TITLE';
    title?: string;
    url?: string;
    open_window?: number;
    visible?: number;
  }): Promise<YuqueTocItem[]> {
    const response = await this.client.put(`/repos/${namespace}/toc`, data);
    return response.data.data;
  }

  // Search endpoints
  async search(q: string, type: 'doc' | 'repo', scope?: string, page?: number, creator?: string): Promise<YuqueSearchResult[]> {
    const params: any = { q, type };
    if (scope) params.scope = scope;
    if (page) params.page = page;
    if (creator) params.creator = creator;

    const response = await this.client.get('/search', { params });
    return response.data.data;
  }

  // 统计数据
  async getGroupStatistics(login: string): Promise<any> {
    const response = await this.client.get(`/groups/${login}/statistics`);
    return response.data.data;
  }

  async getGroupMemberStatistics(login: string, params?: {
    name?: string;
    range?: number;
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: 'desc' | 'asc';
  }): Promise<any> {
    const response = await this.client.get(`/groups/${login}/statistics/members`, { params });
    return response.data.data;
  }

  async getGroupBookStatistics(login: string, params?: {
    name?: string;
    range?: number;
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: 'desc' | 'asc';
  }): Promise<any> {
    const response = await this.client.get(`/groups/${login}/statistics/books`, { params });
    return response.data.data;
  }

  async getGroupDocStatistics(login: string, params?: {
    bookId?: number;
    name?: string;
    range?: number;
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: 'desc' | 'asc';
  }): Promise<any> {
    const response = await this.client.get(`/groups/${login}/statistics/docs`, { params });
    return response.data.data;
  }
}