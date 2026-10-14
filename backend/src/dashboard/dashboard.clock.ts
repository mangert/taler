/** Предоставляет текущее время для расчётов сводки. */
import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardClock {
  /** Возвращает текущее время. */
  now(): Date {
    return new Date();
  }
}
