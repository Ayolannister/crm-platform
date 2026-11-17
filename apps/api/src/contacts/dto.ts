import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateContactDto {
  @IsString() @Length(1, 100) firstName!: string;
  @IsOptional() @IsString() @Length(1, 100) lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Length(3, 30) phone?: string;
}

export class UpdateContactDto {
  @IsOptional() @IsString() @Length(1, 100) firstName?: string;
  @IsOptional() @IsString() @Length(1, 100) lastName?: string | null;
  @IsOptional() @IsEmail() email?: string | null;
  @IsOptional() @IsString() @Length(3, 30) phone?: string | null;
}
