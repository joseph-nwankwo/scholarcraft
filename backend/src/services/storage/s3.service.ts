import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'
import { s3Client, S3_BUCKET, S3_PUBLIC_URL } from '../../config/s3'

export const s3Service = {
  async upload(file: Express.Multer.File, folder: string): Promise<{ key: string; url: string }> {
    const ext = file.originalname.split('.').pop() ?? 'bin'
    const key = `${folder}/${uuidv4()}.${ext}`

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    )

    const base = S3_PUBLIC_URL ?? `https://${S3_BUCKET}.s3.amazonaws.com`
    const url = `${base}/${key}`
    return { key, url }
  },

  async delete(key: string): Promise<void> {
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
  },

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
    return getSignedUrl(s3Client, command, { expiresIn })
  },
}
