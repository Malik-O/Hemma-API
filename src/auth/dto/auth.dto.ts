import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  credential!: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
