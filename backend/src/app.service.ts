/** Формирует приветственный ответ приложения. */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /** Возвращает приветствие приложения. */
  getHello(): string {
    return 'Hello World!';
  }
}
