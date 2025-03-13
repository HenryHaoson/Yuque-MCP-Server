# Yuque MCP Server

A Model-Context-Protocol (MCP) server for integrating with Yuque's API. This implementation is inspired by [Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP) and uses the [Yuque Open API](https://app.swaggerhub.com/apis-docs/Jeff-Tian/yuque-open_api/2.0.1).

## Overview

This server provides MCP tools for interacting with Yuque's knowledge base platform, allowing AI models to:

- Get user and document information
- Create, read, update, and delete documents
- Search content in Yuque
- Get repository information
- Get statistics and analytical data

## Installation

### Prerequisites

- Node.js 18+ (recommended)
- Yuque account with API token

### Setup

1. Clone this repository:
   ```
   git clone https://github.com/Henryhaoson/Yueque-MCP-Server.git
   cd Yueque-MCP-Server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example`:
   ```
   cp .env.example .env
   ```

4. (Optional) Add your Yuque API token in the `.env` file:
   ```
   YUQUE_API_TOKEN=your_yuque_api_token_here
   ```
   
   You can also choose to provide the token via query parameters when connecting to the server instead of setting it in the .env file.

## Usage

### Running the Server

#### Development Mode

```bash
# HTTP server mode
npm run dev

# CLI stdio mode
npm run dev:cli
```

#### Production Mode

First, build the project:

```bash
npm run build
```

Then run in either HTTP or CLI mode:

```bash
# HTTP server mode
npm run start

# CLI stdio mode
npm run start:cli
```

### Deployment with Docker

This project provides Docker support, making it easy to containerize and deploy the server.

#### Using Docker Compose (Recommended)

1. Build and start the container:
   ```bash
   docker-compose up -d
   ```

2. View logs:
   ```bash
   docker-compose logs -f
   ```

3. Stop the service:
   ```bash
   docker-compose down
   ```

You can set configuration options via environment variables or in the `.env` file:
```bash
# .env file example
PORT=3000
YUQUE_API_TOKEN=your_token_here
YUQUE_API_BASE_URL=https://www.yuque.com/api/v2
```

#### Manual Docker Usage

1. Build the Docker image:
   ```bash
   docker build -t yuque-mcp-server .
   ```

2. Run the container:
   ```bash
   docker run -d -p 3000:3000 --name yuque-mcp-server yuque-mcp-server
   ```

3. Using environment variables:
   ```bash
   docker run -d -p 3000:3000 \
     -e YUQUE_API_TOKEN=your_token_here \
     -e YUQUE_API_BASE_URL=https://www.yuque.com/api/v2 \
     --name yuque-mcp-server yuque-mcp-server
   ```

### MCP Tools

The Yuque MCP Server provides the following tools:

#### User and Document Management
- `get_current_user` - Get information about the currently authenticated user
- `get_user_docs` - Get all documents for the current user, including private and collaborative documents
- `get_user_repos` - Get the repositories of a specified user
- `get_repo_docs` - Get all documents in a specific repository
- `get_doc` - Get the detailed content of a specific document in Yuque
- `create_doc` - Create a new document in a specified repository
- `update_doc` - Update an existing document in Yuque
- `delete_doc` - Delete a specified document from a Yuque repository
- `search` - Search for documents or repositories in the Yuque platform

#### Team Statistics Analysis
- `get_group_statistics` - Get summary statistics for a team
- `get_group_member_statistics` - Get statistics for team members
- `get_group_book_statistics` - Get statistics for team repositories
- `get_group_doc_statistics` - Get statistics for team documents

## Integration with AI Models

This MCP server can be used with AI models that support the Model-Context-Protocol, allowing them to interact with Yuque through defined tools. For example:

1. Start the MCP server
2. Connect to the server from a compatible client
3. The AI model can now use the registered tools to interact with Yuque data

### Query Parameters for SSE Endpoint

When connecting to the SSE endpoint, you can override environment configurations via query parameters, which take precedence over environment variables:

- `accessToken`: Overrides the Yuque API token set in the .env file
- `baseUrl`: Overrides the Yuque API base URL set in the .env file

Example:
```
http://localhost:3000/sse?accessToken=your_token_here&baseUrl=https://custom.yuque.api/v2
```

This allows you to dynamically configure the service without modifying the .env file, and query parameters take precedence over environment variables. This is especially useful for multi-user environments or testing different API endpoints.

Each SSE connection can use different configurations, allowing a single server instance to serve different users or environments simultaneously.

## Development

### Project Structure

```
src/
  ├── config.ts          # Server configuration
  ├── index.ts           # Main entry point
  ├── cli.ts             # CLI entry point 
  ├── server.ts          # MCP server implementation
  └── services/
      └── yuque.ts       # Yuque API service
```

### Adding New Tools

To add a new tool, modify the `registerTools` method in `src/server.ts`.

## API Improvements

Recent updates have added the following features:

1. **Team Statistics**: Added functionality to get statistics for teams, members, repositories, and documents to facilitate analysis and monitoring of team knowledge base usage.

2. **Document Management Enhancements**:
   - Support for multiple document formats (Markdown, HTML, Lake)
   - Comprehensive document publicity settings (private, public, enterprise-internal public)
   - Search functionality with more parameters and filtering conditions

3. **Data Type Refinement**: Updated interface definitions to remain consistent with the Yuque OpenAPI specification.

## License

ISC

## Acknowledgements

- [Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP) for the MCP server implementation
- [Yuque Open API](https://app.swaggerhub.com/apis-docs/Jeff-Tian/yuque-open_api/2.0.1) for API documentation
- [Model Context Protocol](https://github.com/anthropics/model-context-protocol) for the MCP specification 