const fs = require('fs')
const path = require('path')

const serverDir = path.join(process.cwd(), '.next', 'server')
const chunksDir = path.join(serverDir, 'chunks')

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
