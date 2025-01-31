import {IsNotEmpty, IsEmail} from "class-validator"

export class ResetPasswordConfirmationDto {
    @IsNotEmpty()
    readonly code : string
    @IsEmail()
    readonly email : string 
    @IsNotEmpty()
    readonly password : string
}