import { Auth0Provider } from '@bcwdev/auth0provider'
import BaseController from '../utils/BaseController.js'

const VALUES = [
  { id: 1, name: 'value1' },
  { id: 2, name: 'value2' },
]


export class ValuesController extends BaseController {
  constructor() {
    super('api/values')
    this.router
      .get('', this.getAll)
      .get('/:id', this.getOneValue)
      // NOTE: Beyond this point all routes require Authorization Bearer token
      .use(Auth0Provider.getAuthorizedUserInfo)
      .post('', this.create)
  }

  async getAll(request, response, next) {
    try {
      response.send(VALUES)
    } catch (error) {
      next(error)
    }
  }

  async getOneValue(request, response, next) {
    try {
      const value = VALUES.find(v => v.id === parseInt(request.params.id))
      if (!value) {
        throw new Error('Invalid Id')
      }
      response.send(value)
    } catch (error) {
      next(error)
    }
  }

  /**
 * Creates a new value from request body and returns the value
 * @param {import("express").Request} request
 * @param {import("express").Response} response
 * @param {import("express").NextFunction} next
 */
  async create(request, response, next) {
    try {
      const newValue = request.body
      // NOTE NEVER TRUST THE CLIENT TO ADD THE CREATOR ID
      // @ts-ignore
      newValue.creatorId = request.userInfo.id
      newValue.id = VALUES.length + 1
      VALUES.push(newValue)
      // NOTE: This is a mock of what a service would do
      response.send(newValue)
    } catch (error) {
      next(error)
    }
  }
}