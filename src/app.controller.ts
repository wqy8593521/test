import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Post('getSalt')
  getSalt(@Body() body: any) {
    return this.appService.getSlat(body.username, body.password);
  }
  @Post('login')
  login(@Body() body: any) {
    return this.appService.login(body);
  }
}
