import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ConfirmMfaEnrollmentDto, VerifyMfaLoginDto } from '../dto/mfa.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('mfa/verify')
  @HttpCode(200)
  verifyMfa(@Body() dto: VerifyMfaLoginDto) {
    return this.authService.verifyMfaAndCompleteLogin(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto);
    return { loggedOut: true };
  }

  /**
   * Deliberately guarded by JwtAuthGuard only (no PermissionsGuard/RequirePermissions):
   * a user whose privileged role forced `mfa_setup_required` at login holds a token
   * with an empty permissions array, so this is the only endpoint such a token can reach.
   */
  @Post('mfa/enroll')
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  enrollMfa(@CurrentUser() user: JwtClaims) {
    return this.authService.enrollMfa(user.sub);
  }

  @Post('mfa/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async confirmMfa(@CurrentUser() user: JwtClaims, @Body() dto: ConfirmMfaEnrollmentDto) {
    await this.authService.confirmMfaEnrollment(user.sub, dto);
    return { mfaEnabled: true };
  }
}
