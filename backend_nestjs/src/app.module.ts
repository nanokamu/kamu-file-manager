import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import { join } from 'path';
import { CoreModule } from './core/core.module';
import { FilesModule } from './modules/files/files.module';

const publicPath = join(__dirname, '..', 'public');

@Module({
  imports: [
    CoreModule,
    FilesModule,
    ...(existsSync(publicPath)
      ? [
          ServeStaticModule.forRoot({
            rootPath: publicPath,
            exclude: ['/api/{*path}'],
            renderPath: '/{*path}',
          }),
        ]
      : []),
  ],
})
export class AppModule {}
