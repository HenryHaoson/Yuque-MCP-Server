import axios, { AxiosInstance } from 'axios';

export interface YuqueUser {
  id: number;
  type: string;
  login: string;
  name: string;
  description: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
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
  comments_count: number;
  content_updated_at: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  content?: string;
  book?: YuqueRepo;
  user?: YuqueUser;
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
}

export class YuqueService {
  private client: AxiosInstance;
  private baseURL: string;
  private apiToken: string;

  constructor(apiToken: string = '', baseURL: string = 'https://www.yuque.com/api/v2') {
    this.apiToken = apiToken;
    this.baseURL = baseURL;
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

  // User endpoints
  async getCurrentUser(): Promise<YuqueUser> {
    const response = await this.client.get('/user');
    return response.data.data;
  }

  async getUserDocs(): Promise<YuqueDoc[]> {
    const response = await this.client.get('/user/docs');
    return response.data.data;
  }

  // Repo endpoints
  async getUserRepos(login: string): Promise<YuqueRepo[]> {
    const response = await this.client.get(`/users/${login}/repos`);
    return response.data.data;
  }

  async getRepo(namespace: string): Promise<YuqueRepo> {
    const response = await this.client.get(`/repos/${namespace}`);
    return response.data.data;
  }

  // Document endpoints
  async getRepoDocs(namespace: string): Promise<YuqueDoc[]> {
    const response = await this.client.get(`/repos/${namespace}/docs`);
    return response.data.data;
  }

  async getDoc(namespace: string, slug: string): Promise<YuqueDoc> {
    const response = await this.client.get(`/repos/${namespace}/docs/${slug}`);
    return response.data.data;
  }

  async createDoc(
    namespace: string,
    title: string,
    slug: string,
    body: string,
    isPublic: boolean = true
  ): Promise<YuqueDoc> {
    const response = await this.client.post(`/repos/${namespace}/docs`, {
      title,
      slug,
      public: isPublic ? 1 : 0,
      body,
    });
    return response.data.data;
  }

  async updateDoc(
    namespace: string,
    id: number,
    title?: string,
    slug?: string,
    body?: string,
    isPublic?: boolean
  ): Promise<YuqueDoc> {
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (body !== undefined) data.body = body;
    if (isPublic !== undefined) data.public = isPublic ? 1 : 0;

    const response = await this.client.put(`/repos/${namespace}/docs/${id}`, data);
    return response.data.data;
  }

  async deleteDoc(namespace: string, id: number): Promise<void> {
    await this.client.delete(`/repos/${namespace}/docs/${id}`);
  }

  // Search endpoints
  async search(q: string, type?: string): Promise<any[]> {
    const params: any = { q };
    if (type) params.type = type;

    const response = await this.client.get('/search', { params });
    return response.data.data;
  }
}