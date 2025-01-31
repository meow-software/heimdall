import {IsNotEmpty} from "class-validator"

export class DeleteAccounDto {
    @IsNotEmpty()
    readonly password : string;
}