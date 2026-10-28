    import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

    export class SignupDto {
      @IsString()
      @Length(2, 100)
      orgName!: string;

      @Matches(/^[a-z0-9-]{3,40}$/, {
        message: 'orgSlug must be 3-40 lowercase letters, numbers or hyphens',
      })
      orgSlug!: string;

      @IsEmail()
      email!: string;

      @IsString()
      @MinLength(12)
      password!: string;
    }

    export class LoginDto {
      @IsEmail()
      email!: string;

      @IsString()
      password!: string;
    }