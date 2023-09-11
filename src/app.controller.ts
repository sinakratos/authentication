import { Body, Controller, Get, Post, Render } from '@nestjs/common';
import { AppService } from './app.service';
import { User } from './app.entity';
import { JwtService } from '@nestjs/jwt';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @Render('email-templates/index')
  root() { }

  @Get('email-templates/verify')
  @Render('verify')
  verifyEmail() {
  }


  @Post('/signup')
  async Signup(@Body() user: User) {
    return await this.appService.signup(user);
  }

  @Post('/signin')
  async Signin(@Body() user: User, jwt: JwtService) {
    return await this.appService.signin(user, jwt);
  }

  @Post('/verify')
  async Verify(@Body() body) {
    return await this.appService.verifyAccount(body.code);
  }
}
