import { Server, Socket } from 'socket.io'
import { attachHandlers } from '../Setup.js'
import { logger } from './utils/Logger.js'

const SOCKET_EVENTS = {
  connection: 'connection',
  connected: 'connected',
  disconnect: 'disconnect',
  userConnected: 'userConnected',
  userDisconnected: 'userDisconnected',
  error: 'error'
}

class SocketProvider {
  /**
   * @type {Server}
   */
  io = null
  initialize(httpServer) {
    try {
      this.io = new Server(httpServer, {
        cors: {
          // TODO UPDATE THE origin for production
          origin: '*',
          methods: ['GET', 'POST']
        }
      })
      this.io.on(SOCKET_EVENTS.connection, this.onConnect.bind(this))
    } catch (e) {
      logger.error('[SOCKETSTORE ERROR]', e)
    }
  }

  /**
   * 
   * @param {Socket} socket 
   */
  onConnect(socket) {
    try {
      attachHandlers(this.io, socket)
      socket.emit(SOCKET_EVENTS.connected, {
        sid: socket.id,
        data: socket.data,
        isConnected: socket.connected
      })

    }
    catch (error) {
      logger.error('[SOCKET_ATTACHMENT ERROR]', error)
    }
  }

  /**
   * Sends a direct message to a user
   * @param {string} userId
   * @param {string} eventName
   * @param {any} payload
   */
  messageUser(userId, eventName, payload) {
    this.io.to(userId).emit(eventName, payload)
  }

  /**
   * Sends a message to all sockets in a room
   * @param {string} room
   * @param {string} eventName
   * @param {any} payload
   */
  messageRoom(room, eventName, payload) {
    this.io.to(room).emit(eventName, payload)
  }

  /**
   * Sends a message to all connected sockets
   * @param {string} eventName
   * @param {any} payload
   */
  messageAll(eventName, payload) {
    this.io.emit(eventName, payload)
  }
}

export const socketProvider = new SocketProvider()
