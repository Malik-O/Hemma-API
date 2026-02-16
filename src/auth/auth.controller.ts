import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthDto, RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Exchange a Google ID token for a JWT */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  google(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto.credential);
  }

  /** Register a new local account */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.displayName, dto.password);
  }

  /** Login with email/password */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /** Get current user profile (requires valid JWT) */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: { uid: string; email: string }) {
    return this.authService.getProfile(user.uid);
  }
}
