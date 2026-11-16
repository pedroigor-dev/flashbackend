import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json } from 'express';
import { AppModule } from './app.module';

export async function createApp() {
  const app = await NestFactory.create(AppModule,{bodyParser:false});
  app.use(helmet());
  app.use(json({limit:'96kb'}));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  app.enableShutdownHooks();
  return app;
}
if (require.main === module) void createApp().then(app => app.listen(Number(process.env.PORT || 4000),'127.0.0.1'));
