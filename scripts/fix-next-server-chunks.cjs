const fs = require('fs')
const path = require('path')

const serverDir = path.join(process.cwd(), '.next', 'server')
const chunksDir = path.join(serverDir, 'chunks')
const appDir = path.join(serverDir, 'app')

if (!fs.existsSync(serverDir) || !fs.existsSync(chunksDir)) {
  process.exit(0)
}

for (const fileName of fs.readdirSync(chunksDir)) {
  if (!fileName.endsWith('.js')) {
    continue
  }

  const sourcePath = path.join(chunksDir, fileName)
  const destinationPath = path.join(serverDir, fileName)

  fs.copyFileSync(sourcePath, destinationPath)
}

function getRouteKeyFromNftPath(nftPath) {
  const parentDir = path.dirname(nftPath)
  const routeSegments = path
    .relative(appDir, parentDir)
    .split(path.sep)
    .filter(Boolean)
    .join('/')

  return routeSegments ? `/${routeSegments}/page` : '/page'
}

function buildManifestStub(routeKey) {
  const emptyManifest = {
    moduleLoading: { prefix: '/_next/' },
    ssrModuleMapping: {},
    edgeSSRModuleMapping: {},
    clientModules: {},
    entryCSSFiles: {},
    rscModuleMapping: {},
    edgeRscModuleMapping: {},
  }

  return `globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST[${JSON.stringify(routeKey)}]=${JSON.stringify(emptyManifest)}\n`
}

function ensurePageClientReferenceManifests(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      ensurePageClientReferenceManifests(fullPath)
      continue
    }

    if (!entry.isFile() || entry.name !== 'page.js.nft.json') {
      continue
    }

    let trace
    try {
      trace = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
    } catch {
      continue
    }

    if (!Array.isArray(trace.files) || !trace.files.includes('page_client-reference-manifest.js')) {
      continue
    }

    const manifestPath = path.join(path.dirname(fullPath), 'page_client-reference-manifest.js')
    if (fs.existsSync(manifestPath)) {
      continue
    }

    const routeKey = getRouteKeyFromNftPath(fullPath)
    fs.writeFileSync(manifestPath, buildManifestStub(routeKey), 'utf8')
  }
}

if (fs.existsSync(appDir)) {
  ensurePageClientReferenceManifests(appDir)
}
