import { Controller, Get } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Controller()
export class AppController {
  constructor(private readonly sequelize: Sequelize) {}

  @Get('health')
  async health() {
    await this.sequelize.authenticate();
    return { status: 'ok' };
  }
}
