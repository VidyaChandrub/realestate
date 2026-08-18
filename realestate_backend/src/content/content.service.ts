import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentPageType } from '@prisma/client';
import { PrismaService } from '../user/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getContent(type: ContentPageType) {
    const content = await this.prisma.contentPage.findUnique({ where: { type } });
    if (!content) {
      throw new NotFoundException(`Content not found for type: ${type}`);
    }
    return content;
  }

  async upsertContent(type: ContentPageType, title: string, body: string) {
    return this.prisma.contentPage.upsert({
      where: { type },
      create: {
        type,
        title,
        body,
      },
      update: {
        title,
        body,
      },
    });
  }
}
