import fs from 'node:fs/promises'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { formatSiteDataError, validateSiteData } from './site-data'

const DATA_FILE = path.resolve(process.cwd(), 'src/data/kebab-places.json')
const WRITE_PATH = '/api/site-data'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export function isWriteEndpoint(url?: string, method?: string): boolean {
  return method === 'POST' && Boolean(url?.startsWith(WRITE_PATH))
}

export async function persistSiteData(raw: string, filePath = DATA_FILE): Promise<void> {
  const parsed = JSON.parse(raw) as unknown
  const valid = validateSiteData(parsed)
  await fs.writeFile(filePath, `${JSON.stringify(valid, null, 2)}\n`, 'utf8')
}

export function kebabDataWritePlugin(): Plugin {
  return {
    name: 'kebab-data-write',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!isWriteEndpoint(req.url, req.method)) {
          next()
          return
        }

        try {
          const body = await readBody(req)
          await persistSiteData(body)
          sendJson(res, 200, { ok: true })
        } catch (error) {
          sendJson(res, 400, { ok: false, error: formatSiteDataError(error) })
        }
      })
    },
  }
}
