import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './app.entity';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class AppService {

    private code;

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly mailerService: MailerService
    ) {
        this.code = Math.floor(10000 + Math.random() * 90000);
    }

    async sendConfirmedEmail(user: User) {
        const { email, fullname } = user;
        await this.mailerService.sendMail({
            to: email,
            subject: 'Welcome to Nice App! Email Confirmed',
            template: 'Confirmed',
            context: {
                fullname,
                email
            }
        });
    }

    async sendConfirmationEmail(user: any) {
        const { email, fullname } = await user;
        await this.mailerService.sendMail({
            to: email,
            subject: 'Welcome to Nice App! Confirm Email',
            template: 'Confirmed',
            context: {
                fullname,
                code: this.code
            }
        });
    }

    async signup(user: User): Promise<any> {
        try {
            const salt = await bcrypt.genSalt();
            const hash = await bcrypt.hash(user.password, salt);
            const reqBody = {
                fullname: user.fullname,
                email: user.email,
                password: hash,
                authConfirmToken: this.code
            }
            const newUser = this.userRepository.insert(reqBody);
            await this.sendConfirmationEmail(reqBody);
            return true;
        } catch (error) {
            return new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async signin(user: User, jwt: JwtService): Promise<any> {
        try {
            const foundUser = await this.userRepository.findOne({
                where: {
                    email: user.email
                }
            });
            if (foundUser) {
                if (foundUser.isVerified) {
                    if (bcrypt.compare(user.password, foundUser.password)) {
                        const payload = { email: user.email };
                        return {
                            token: jwt.sign(payload)
                        };
                    }
                } else {
                    return new HttpException('Please verify your account', HttpStatus.UNAUTHORIZED);
                }
                return new HttpException('Incorrect username or password', HttpStatus.UNAUTHORIZED);
            }
            return new HttpException('Incorrect username or password', HttpStatus.UNAUTHORIZED);
        } catch (error) {
            return new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        };
    }

    async verifyAccount(code: string): Promise<any> {
        try {
            const user = await this.userRepository.findOne({
                where: {
                    authConfirmToken: code
                }
            });
            if (!user) {
                return new HttpException('Verification code has expired or not found', HttpStatus.UNAUTHORIZED)
            }
            await this.userRepository.update(
                { authConfirmToken: user.authConfirmToken },
                { isVerified: true, authConfirmToken: undefined }
            );
            await this.sendConfirmationEmail(user);
            return true;
        } catch (error) {
            return new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}
