import { Auth0Provider } from "@bcwdev/auth0provider";
import BaseController from "../utils/BaseController.js";
import fileUpload from "express-fileupload";
import { uploadService } from "../services/UploadService.js";



export class UploadController extends BaseController {
  constructor() {
    super('api/upload')
    this.router
      .use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }), 
        Auth0Provider.getAuthorizedUserInfo, (req, res, next)=>{
        if(req.headers['x-access'] !== 'hello'){
          return next(new Error('invalid headers'))
        }
        
        console.log("a request is coming in with auth and a file");
        next()
      })
      .post('', this.uploadImage)
      .post('/sharp', this.uploadImageWithSharp)
      .delete('/:fileName', this.deleteImage)
  }

  async uploadImage(request, response, next) {
    try {
      console.log(request.files)
      const userId = request.userInfo.id
      const uploadedImage = await uploadService.uploadImage(request.files.test, userId)
      response.send(uploadedImage)
    } catch (error) {
      next(error)
    }
  }

  async uploadImageWithSharp(request, response, next) {
    try {
      const userId = request.userInfo.id
      const uploadedImage = await uploadService.uploadWithSharp(request.files.test, userId)
      response.send(uploadedImage)
    } catch (error) {
      next(error)
    }
  }

  async deleteImage(request, response, next) {
    try {
      const userId = request.userInfo.id
      const fileName = request.params.fileName
      console.log('deleteing', fileName);
      const message = await uploadService.deleteImage(fileName, userId)
      response.send(message)
    } catch (error) {
      next(error)
    }
  }
}
