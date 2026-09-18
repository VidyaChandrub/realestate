import { Controller, Put, Query, Req, Res, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Controller('uploads')
export class LocalUploadController {
  @Put('local-put')
  async handleLocalPut(
    @Query('key') key: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    if (!key) {
      throw new BadRequestException('Missing key parameter');
    }
    // Sanitize path to prevent directory traversal
    const safeKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, '');
    const targetPath = path.join(process.cwd(), 'uploads', safeKey);

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    const writeStream = fs.createWriteStream(targetPath);
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      res.status(200).send('OK');
    });

    writeStream.on('error', (err: any) => {
      res.status(500).json({ error: err.message });
    });
  }
}
