import { SocketHandler } from '../utils/SocketHandler.js'

export class RoomHandler extends SocketHandler {
  /**
   * @param {import("socket.io").Server} io
   * @param {import("socket.io").Socket} socket
   */
  constructor(io, socket) {
    super(io, socket, true)
    this
      .on('JOIN_ROOM', this.joinRoom)
      .on('LEAVE_ROOM', this.leaveRoom)
  }

  joinRoom(roomName) {
    this.socket.join(roomName)
    this.messageSelf('JOINED_ROOM', roomName)
    this.messageRoom(roomName, 'USER_JOINED', this.profile)
  }

  leaveRoom(roomName) {
    this.socket.leave(roomName)
    this.messageSelf('LEFT_ROOM', roomName)
    this.messageRoom(roomName, 'USER_LEFT', this.profile)
  }


}
