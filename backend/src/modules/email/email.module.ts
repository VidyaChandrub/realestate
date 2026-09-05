import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { AdminEmailController } from './admin-email.controller';
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminEmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
