import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminTypographySetsController, PublicTypographySetsController } from './admin-typography-sets.controller';
import { AdminTypographySetsService } from './admin-typography-sets.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminTypographySetsController, PublicTypographySetsController],
  providers: [AdminTypographySetsService],
})
export class AdminTypographySetsModule {}
