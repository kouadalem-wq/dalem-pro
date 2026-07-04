// src/cloudinary/cloudinary.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    // La config est lue depuis les variables d'environnement.
    // En local comme en prod, il faut CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET.
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  // Envoie le buffer d'un fichier (Multer memoryStorage) vers Cloudinary
  // et renvoie l'URL permanente (secure_url). Le parametre "folder" range
  // les fichiers dans un dossier Cloudinary (ex: dalem-pro/logos).
  uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            return reject(
              new InternalServerErrorException(
                "Echec de l'envoi du fichier vers Cloudinary.",
              ),
            );
          }
          resolve(result.secure_url);
        },
      );

      // On transforme le buffer en flux lisible et on le pousse dans Cloudinary.
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}
