import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { sharpService } from "./SharpService.js";
import sharp from "sharp";

const IAMKEY = process.env.AWS_IAM_ACCESS_KEY ?? ''
const SECRET = process.env.AWS_SECRET_KEY ?? ''
const BUCKET_NAME = process.env.BUCKET_NAME ?? ''
const REGION = process.env.REGION ?? ''

const s3Client = new S3Client({
  region: REGION,
  credentials: { accessKeyId: IAMKEY, secretAccessKey: SECRET, }
})

class UploadService {
  async uploadImage(file, userId) {
    const Key = 'public/'+ userId + '/' + Date.now() + '_' +  file.name
    const uploadRequest = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key,
      Body: file.data,
      ContentType: file.mimetype,
      CacheControl: 'max-age=36000'
    })
    const s3Response = await s3Client.send(uploadRequest)
    console.log('uploaded completed', s3Response)
    let imgUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${Key}`
    return imgUrl
  }

  async deleteImage(fileName, userId) {
    const deleteRequest = new DeleteObjectCommand({
      Bucket: 'cw-upload-demo',
      Key: userId + '/' + fileName
    })
    const response = await s3Client.send(deleteRequest)
    if (response.$metadata.httpStatusCode != 200) throw new Error("Could not delete")
    console.log('deleted', response)
    return 'deleted ' + fileName
  }


  async uploadWithSharp(file, userId) {
    // if (file.data.length > 50 * 1024) throw new Error("FILE TOO BIG")
    const sharpImg = sharp(file.data)
    const shrunkImg = await sharpService.shrink(sharpImg)
    const jpegImg = await sharpService.toJPEG(shrunkImg)
    file.data = await jpegImg.toBuffer()
    file.mimetype = 'image/jpg'
    file.name = file.name.split('.')[0] + '.jpg' // changing to a jpeg
    const url = await this.uploadImage(file, userId)
    return { url }
  }

}

export const uploadService = new UploadService()
