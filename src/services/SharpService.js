import sharp from "sharp"


class SharpService {

  /**
   * @param {import("sharp").Sharp} sharpImg
   */
  async shrink(sharpImg) {
    const { width, height } = await sharpImg.metadata()
    const shrunk = sharpImg.resize(width * .25)
    return shrunk
  }

  /**
  * @param {import("sharp").Sharp} sharpImg
  */
  async toJPEG(sharpImg) {
    const options = { quality: 70, chromaSubsampling: '4:4:4' }
    const jpeg = sharpImg.jpeg(options)
    return jpeg
  }

  /**
  * @param {import("sharp").Sharp} sharpImg
  */
  async toWEBP(sharpImg) {
    const options = { quality: 20, nearLossless: true }
    const webp = sharpImg.webp(options)
    return webp
  }

}

export const sharpService = new SharpService()
