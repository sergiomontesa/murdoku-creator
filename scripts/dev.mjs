/**
 * Arranque del servidor de desarrollo con puerto flexible.
 * Busca el primer puerto libre desde el 8888 y lanza `vp dev --port <libre>`,
 * de modo que si el puerto está ocupado se toma otro automáticamente.
 * Uso: `pnpm dev [-- <args extra para vp dev>]`
 */
import net from 'node:net'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/** Puerto preferido (coincide con `server.port` de vite.config.ts) */
const PREFERRED_PORT = 8888

/** Comprueba si un puerto está libre intentando ocuparlo en IPv4 local y global */
function isPortFree(port) {
  const tryListen = (host) =>
    new Promise((resolve) => {
      const server = net.createServer()
      server.once('error', () => resolve(false))
      server.listen(port, host, () => {
        server.close(() => resolve(true))
      })
    })
  return (async () => {
    // Basta con que falle en una interfaz para considerarlo ocupado
    if (!(await tryListen('127.0.0.1'))) return false
    if (!(await tryListen('0.0.0.0'))) return false
    return true
  })()
}

/** Primer puerto libre desde el preferido */
async function findFreePort(from) {
  let port = from
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (await isPortFree(port)) return port
    console.log(`Puerto ${port} ocupado, probando con el ${port + 1}...`)
    port++
  }
}

const extraArgs = process.argv.slice(2)
const port = await findFreePort(PREFERRED_PORT)
if (port !== PREFERRED_PORT) {
  console.log(`Puerto ${PREFERRED_PORT} en uso, usando el ${port}.`)
}
// Ejecuta el binario de `vp` con node directamente (sin shell) para evitar
// avisos de seguridad y no depender del PATH
const vpBin = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'node_modules',
  'vite-plus',
  'bin',
  'vp',
)
const child = spawn(
  process.execPath,
  [existsSync(vpBin) ? vpBin : 'vp', 'dev', '--port', String(port), ...extraArgs],
  { stdio: 'inherit', shell: false },
)
child.on('exit', (code) => process.exit(code ?? 0))
