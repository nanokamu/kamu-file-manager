import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import { join } from 'path';
import { CoreModule } from './core/core.module';
import { AddonModule } from './modules/addon/addon.module';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { UsersModule } from './modules/users/users.module';

const publicPath = join(__dirname, '..', 'public');

@Module({
  imports: [
    CoreModule,
    UsersModule,
    AuthModule,
    AddonModule,
    FilesModule,
    ...(existsSync(publicPath)
      ? [
          // Static assets are served by Express middleware and bypass APP_GUARD.
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
