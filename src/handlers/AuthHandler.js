import { Auth0Provider } from '@bcwdev/auth0provider'
import { attachHandlers } from '../../Setup.js'
import { SocketHandler } from '../utils/SocketHandler.js'

export class AuthHandler extends SocketHandler {
  /**
   * @param {import("socket.io").Server} io
   * @param {import("socket.io").Socket} socket
   */
  constructor(io, socket) {
    super(io, socket)
    this
      .on('authenticate', this.onAuthenticate)
      .on('disconnect', this.onDisconnect)
  }

  async onAuthenticate(bearerToken) {
    try {
      const user = await Auth0Provider.getUserInfoFromBearerToken(bearerToken)
      const limitedProfile = {
        id: user.id,
        picture: user.picture
      }
      this.socket.join(user.id)
      attachHandlers(this.io, this.socket, user, limitedProfile)
      this.messageSelf('authenticated', user)
      this.messageAll('userConnected', limitedProfile)
    } catch (e) {
      this.socket.emit('error', e)
    }
  }

  async onDisconnect() {
    this.io.emit('userDisconnected', this.profile)
  }
}
