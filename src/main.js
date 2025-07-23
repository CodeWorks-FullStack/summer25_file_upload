import express from 'express'
import { createServer } from 'http'
import { socketProvider } from './SocketProvider.js'
import { Startup } from './Startup.js'
import { DbConnection } from './db/DbConfig.js'
import { logger } from './utils/Logger.js'

// create server & socketServer
const app = express()
const port = process.env.PORT || 3000

if (process.env.NODE_ENV == 'dev') {
  // @ts-ignore
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 1;
}

const httpServer = createServer(app)
Startup.ConfigureGlobalMiddleware(app)
Startup.ConfigureRoutes(app)

// Establish Socket
socketProvider.initialize(httpServer)

// Connect to Atlas MongoDB
DbConnection.connect()

// Start Server
httpServer.listen(port, () => {
  logger.info(`[NODE_ENV] ${process.env.NODE_ENV} ${process.version} `)
  logger.log(`[SERVER IS LIVE AT]\n\t- 🌐 http://localhost:${port}\n`)
})
