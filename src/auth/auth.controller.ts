import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión y obtener JWT' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtener usuario autenticado actual' })
  @ApiResponse({
    status: 200,
    description: 'Usuario autenticado obtenido correctamente',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  me(@Req() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('test/admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Ruta de prueba protegida (solo ADMIN)' })
  adminOnly(@Req() req: any) {
    return {
      ok: true,
      message: 'Ruta solo ADMIN',
      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AGENT')
  @Get('test/support')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Ruta de prueba protegida (AGENT/ADMIN)' })
  supportOnly(@Req() req: any) {
    return {
      ok: true,
      message: 'Ruta ADMIN o AGENT',
      user: req.user,
    };
  }
}
