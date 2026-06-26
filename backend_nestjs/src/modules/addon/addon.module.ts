import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { AddonController } from './controllers/addon.controller';
import { AddonService } from './services/addon.service';

@Module({
  imports: [FilesModule],
  controllers: [AddonController],
  providers: [AddonService],
})
export class AddonModule {}
