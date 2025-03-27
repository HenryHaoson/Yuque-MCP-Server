import getRawBody from "raw-body";
import contentType from "content-type";
const MAXIMUM_MESSAGE_SIZE = "4mb";import express from 'express';

export function mcpHook_updateMessageEndpoint(req:express.Request) {
    const query = req.query;
    const queryString = Object.entries(query)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    const url = `/messages?${queryString}`;
    return url;
}

export async function mcpHook_updateMessageBody(req:express.Request) :Promise<any>{
    const query = req.query as Record<string, string>;
    const fixedQuery = getFixedQuery(query);
    const ct = contentType.parse(req.headers["content-type"] ?? "");
    const body = await getRawBody(req, {
      limit: MAXIMUM_MESSAGE_SIZE,
      encoding: ct.parameters.charset ?? "utf-8",
    });
    
    console.log("body: "+body);
    const bodyJson = JSON.parse(body);
    if (bodyJson.method === "tools/call") {
        if(!bodyJson.params.arguments) {
            bodyJson.params.arguments = {};
        }
        bodyJson.params.arguments = {
            ...bodyJson.params.arguments,
            ...fixedQuery
        };
    }
    
    console.log(`bodyJson: ${JSON.stringify(bodyJson)}`);
    return bodyJson;
}

export function getFixedQuery(query: Record<string, string>) {
    // query may be error like this:
    // {
    //     "somequery": "1234567890?sessionId=1234567890",
    //     "somequery": "https://www.yuque.com"
    // }
    // we need to convert it to:
    // {
    //     "somequery": "1234567890",
    //     "somequery": "https://www.yuque.com",
    //     "sessionId": "1234567890"
    // }
    const fixedQuery = {} as Record<string, string>;
    for (const key in query) {
        if (query[key] && typeof query[key] === 'string') {
            const value = query[key];
            // if match ?sessionId= , then add sessionId to fixedQuery  
            if (value.match(/^[^?]+?\?sessionId=([^&]+)/)) {
                fixedQuery[key] = value.split("?")[0];
                const match = value.match(/\?sessionId=([^&]+)/);
                if (match && match[1]) {
                    fixedQuery["sessionId"] = match[1];
                }
            } else {
                fixedQuery[key] = value;
            }
        }
    }
    return fixedQuery;
}