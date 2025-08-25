import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get("/")
  heimdall() {
    return {
      'Heimdall': `I am the trumpet that gives warning. Before access to Tellme is granted, your worth shall be judged. None may enter the Realm until their Identity has been verified and their Right of Passage established. The road ahead is a privilege, not a given.`
    }
  }

  @Get("/ping")
  ping(): string {
    return this.appService.ping();
  }

  @Get("/health")
  health(): any {
    return this.appService.health();
  }

}
