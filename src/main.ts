import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { updateLastProcessedBlock } from './common/utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
   // Omogućiti CORS za frontend
   app.enableCors({
    origin: 'http://localhost:5173', // Postavi tvoju frontend adresu ovde
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
  });

  //updateLastProcessedBlock(0);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
