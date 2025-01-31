import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from "nodemailer";

@Injectable()
export class MailerService {
    
    constructor(  
        private readonly configService : ConfigService
    ) {}
    private async transporter() {
        const testAccount = await nodemailer.createTestAccount()
        const transport =  nodemailer.createTransport({
            host :  this.configService.get<string>("MAILER_HOST"),
            port : this.configService.get<number>("MAILER_PORT"),
            ignoreTLS : true, 
            auth : {
                user : testAccount.user, 
                pass : testAccount.pass
            }
        });
        return transport;
    }

    async sendSignupConfirmation(userEmail : string){
        (await this.transporter()).sendMail({
            from: `no-reply@${this.configService.get<string>("MAILER_HOST")}`,
            to: userEmail,
            subject: "Inscription",
            html: "<h3>Confirmation of Inscription</h3>",
        });
    }

    async sendResetPassword(userEmail : string, url : string, code : string){
        (await this.transporter()).sendMail({
            from: `no-reply@${this.configService.get<string>("MAILER_HOST")}`,
            to: userEmail,
            subject: "Reset password",
            html: `
                <a href="${url}">Reset password</a>
                <p>Secret code <strong>${code}</string></p>
                <p>Code will expire in 15 minutes</p>
            `,
        });
    }
}
