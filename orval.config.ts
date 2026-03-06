import fs from 'node:fs'
import path from 'node:path'

import { defineConfig } from 'orval'

const rootDir = process.cwd()

function resolveOpenAPISpec() {
  const candidates = [
    process.env.ZVAS_OPENAPI_SPEC,
    path.resolve(rootDir, '../docs/swagger/swagger.json'),
    path.resolve(rootDir, '../zvas/docs/swagger/swagger.json'),
  ].filter((candidate): candidate is string => Boolean(candidate))

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(`未找到 Swagger JSON，可通过 ZVAS_OPENAPI_SPEC 指定。已尝试: ${candidates.join(', ')}`)
}

export default defineConfig({
  zvas: {
    input: {
      target: resolveOpenAPISpec(),
    },
    output: {
      mode: 'single',
      target: './src/api/generated/sdk.ts',
      schemas: './src/api/generated/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/client.ts',
          name: 'apiClient',
        },
      },
    },
  },
})
