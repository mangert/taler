/** Обрабатывает запрос к корневому маршруту. */
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  /** Получает зависимости для работы класса. */
  constructor(private readonly appService: AppService) {}

  /** Возвращает приветствие приложения. */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
