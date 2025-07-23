import fs from 'fs'
import express from 'express'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'
import BaseController from './src/utils/BaseController.js'
import { logger } from './src/utils/Logger.js'
import { createOpenAPISpec } from './src/utils/openAPI.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const CONTROLLERS = []
const HANDLERS = []


let ROUTE_PREFIX = process.env.ROUTE_PREFIX || ''
if (ROUTE_PREFIX && ROUTE_PREFIX[0] != '/') {
  ROUTE_PREFIX = '/' + ROUTE_PREFIX
}

export class Paths {
  static get Public() {
    return join(__dirname, 'www')
  }

  static get Server() {
    return join(__dirname, 'src')
  }

  static get Controllers() {
    return this.Server + '/controllers'
  }

  static get Handlers() {
    return this.Server + '/handlers'
  }
}

export async function RegisterControllers(router, subdir = '') {
  const directory = subdir ? join(Paths.Controllers, subdir) : Paths.Controllers
  const controllers = fs.readdirSync(directory)
  await Promise.allSettled(controllers.map(loadController))
  logger.info('Controllers Registered', controllers.length)

  async function loadController(filename) {
    try {
      if (!filename.endsWith('.js')) return

      const controllerPath = pathToFileURL(join(directory, filename)).href
      const fileHandler = await import(controllerPath)
      let controllerClass = fileHandler[filename.slice(0, -3)]

      if (controllerClass === undefined) {
        throw new Error(`Exported class does not match the name of file, ${filename}`)
      }

      if (fileHandler.default) {
        controllerClass = fileHandler.default
      }

      const controller = new controllerClass()
      if (!(controller instanceof BaseController)) {
        logger.warn('Skipped Controller since it is not a BaseController', controllerClass.name)
        return
      }

      CONTROLLERS.push(controller)
      router.use(controller.mount, controller.router)
    } catch (e) {
      console.error(
        '[CONTROLLER ERROR] Unable to load controller, potential duplication, review mount path and controller class name',
        filename,
        e
      )
    }
  }
}

export async function RegisterSocketHandlers() {
  const directory = Paths.Handlers
  const handlers = fs.readdirSync(directory)
  handlers.forEach(async (filename) => {
    try {
      if (!filename.endsWith('.js')) { return }

      const handlerPath = pathToFileURL(join(Paths.Handlers, filename)).href
      const fileHandler = await import(handlerPath)
      let handlerClass = fileHandler[filename.slice(0, -3)]

      if (fileHandler.default) {
        handlerClass = fileHandler.default
      }

      HANDLERS.push(handlerClass)
    } catch (e) {
      logger.error(
        '[SOCKET_HANDLER_ERROR] unable to attach socket handler, potential duplication, review mount path and controller class name, and see error below',
        filename,
        e
      )
    }
  })
}

export async function attachHandlers(io, socket, user, profile) {
  if (socket._handlers && user && profile) {
    return socket._handlers.forEach(handler => handler.attachUser(user, profile))
  }
  socket._handlers = HANDLERS.map(Handler => new Handler(io, socket))
}


export function UseStaticPages(router) {
  router.use(ROUTE_PREFIX, express.static(Paths.Public))
}


export function generateOpenAPISpec() {
  try {
    const spec = createOpenAPISpec(CONTROLLERS)
    fs.writeFileSync('./swagger.json', JSON.stringify(spec, null, 2));
  } catch (e) {
    logger.error('Error generating OpenAPI Spec', e)
  }
}
