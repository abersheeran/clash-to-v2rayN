/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { parse } from "yaml";

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const url = getUrl(request)
		console.log(`${request.method} ${url}`)
		if (!url) {
			return new Response(
				Page,
				{
					headers: { "Content-Type": "text/html" },
					status: 404,
				}
			)
		}
		const response = await fetch(new Request(url, {
			body: request.body,
			headers: request.headers,
			method: request.method,
			redirect: "follow",
		}))
		if (response.status / 100 !== 2) {
			return response
		}
		const clash = parse(await response.text())
		return new Response(
			clash.proxies.map((proxy: any) => {
				switch (proxy.type) {
					case "ss":
						return `ss://${btoa(proxy.cipher + ':' + proxy.password)}@${proxy.server}:${proxy.port}#${proxy.name}`
					case "vmess":
						let c: any;
						const _ = {
							"v": "2",
							"ps": proxy.name,
							"add": proxy.server,
							"port": proxy.port,
							"id": proxy.uuid,
							"aid": proxy.alterId,
							"scy": proxy.cipher
						}
						switch (proxy.network) {
							case "h2":
								c = {
									..._,
									"net": proxy.network,
									"type": "none",
									"host": proxy['h2-opts'].host[0],
									"path": proxy['h2-opts'].path,
									"tls": "tls",
									"sni": proxy['h2-opts'].host[0],
								}
								break;
						}
						return `vmess://${btoa(JSON.stringify(c))}`
				}
			}).join('\n'),
			{
				headers: response.headers,
				status: response.status,
			}
		)
	},
};

const getUrl = (request: Request) => {
	const { pathname, searchParams } = new URL(request.url)
	if (pathname.startsWith("/http")) {
		return pathname.slice(1).replace(/http:\/(?!\/)/, "http://").replace(/https:\/(?!\/)/, "https://")
	}
	const searchParamsUrl = searchParams.get("url");
	if (searchParamsUrl?.startsWith("http")) {
		return decodeURIComponent(searchParamsUrl)
	}
}

const Page = `<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clash to v2rayN | Created by aber</title>
</head>

<body>
    <form>
        <div>
            <input name="url" type="url" />
            <button type="submit">→</button>
        </div>
    </form>
    <style>
        body {
            background-color: #fafafa;
        }

        form {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-top: 100px;
        }

        div {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            border: solid 1px #fafafa;
            box-shadow: 0 0 10px #eee;
        }

        input {
            width: calc(240px + 7vw);
            height: 40px;
            border-radius: 0px;
            border: none;
            outline: none;
            padding: 0 10px;
            flex: 1;
        }

        button {
            width: 50px;
            height: 40px;
            border-radius: 0px;
            border: none;
            background-color: #fff;
            color: #000;
            font-size: 16px;
            cursor: pointer;
        }
    </style>
</body>

</html>
`
