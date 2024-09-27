import { Body, Controller, Get, Inject, Post, Req, UseGuards, Res, } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthLoginDto, AuthRegisterDto } from './dtos/auth.dto';
import { UserService } from 'src/user/user.service';
import { FortyTwoAuthGuard } from './guards/42-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Auth2fGuard } from './guards/tfa-auth.guard';
import { Request, Response } from 'express';
import { toFile } from 'qrcode';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) { }

	@Inject(UserService)
	private readonly userService: UserService;

	@Get('logout')
	async logout(@Res({ passthrough: true }) res: Response) {
		res.cookie('access_token', '', { expires: new Date() });
		res.cookie('auth2f_token', '', { expires: new Date() });
		res.redirect("http://" + process.env.HOST + ":" + process.env.FRONT_PORT + "/auth");
	}

	@Get('/42/login')
	@UseGuards(FortyTwoAuthGuard)
	loginWithFortyTwo() { }

	@Get('/token')
	@UseGuards(JwtAuthGuard)
	async getToken(@Req() req: Request) {
		return (this.authService.getTokenByUser(req["user"]["user"]));
	}


	@Get('/42/callback')
	@UseGuards(FortyTwoAuthGuard)
	async generateAndSetTokens(@Res({ passthrough: true }) res: Response, @Req() req: any) {
		const tokens: string = await this.authService.getTokenByUser(req.user);
		if (req.user.auth2f) {
			res.cookie('auth2f_token', tokens, { httpOnly: true, sameSite: "lax" });
			res.redirect("http://" + process.env.HOST + ":" + process.env.FRONT_PORT + "/auth/2fa/verif");

		}
		else {
			res.cookie('access_token', tokens, { httpOnly: true, sameSite: "lax" });
			res.redirect("http://" + process.env.HOST + ":" + process.env.FRONT_PORT + "/");
		}
	}

	@Post('/login')
	async login(@Body() authLoginDto: any, @Res({ passthrough: true }) res: Response) {
		const userObject = await this.authService.getUserObject(authLoginDto, res);
		if (userObject.user.auth2f) {
			res.cookie('auth2f_token', userObject.tokens, { httpOnly: true, sameSite: "lax" });
			res.statusCode = 207;
		}
		else {
			res.cookie('access_token', userObject.tokens, { httpOnly: true, sameSite: "lax" });
			res.statusCode = 201;
		}
		res.send({ "token": userObject.tokens });
	}

	@Get()
	@UseGuards(JwtAuthGuard)
	async checkLoginStatus() {
		return ({ "statusCode": 200 });
	}

	@Post('/register')
	async register(@Body() authRegisterDto: any, @Res({ passthrough: true }) res) {
		await this.userService.Create_user(new AuthRegisterDto(authRegisterDto));
		const tokens = await this.authService.loginWithCredentials(authRegisterDto, res);
		res.cookie('access_token', tokens, { httpOnly: true, sameSite: "lax" });
		res.statusCode = 201;
	}

	@Post('2fa/generate')
	@UseGuards(JwtAuthGuard)
	async generateTwoFactorAuthQR(@Req() request, @Res({ passthrough: true }) res: Response) {
		const { otpAuthUrl } = await this.authService.generate2FASecret(request.user.user);
		toFile('qrcode/' + request.user.user.email + '.png', otpAuthUrl);
		let QRCode = await this.authService.generateQrCode(otpAuthUrl);
	}

	@Post('2fa/on')
	@UseGuards(JwtAuthGuard)
	async enableTwoFactorAuth(@Req() req, @Body() body, @Res() res) {
		if (this.authService.isValidCode(req.user.user, body.code)) {
			this.userService.enableTwoFactorAuth(req.user.user.id)
			return (res.send({ status: "Success", token: await this.authService.getTokenByUser(req["user"]["user"]) }));
		}
		else
			return (res.send({ status: "Failure", token: "" }));
	}

	@Post('2fa/off')
	@UseGuards(JwtAuthGuard)
	async disableTwoFactorAuth(@Req() req, @Body() body, @Res() res) {
		if (this.authService.isValidCode(req.user.user, body.code)) {
			this.userService.disableTwoFactorAuth(req.user.user.id)
			res.cookie('auth2f_token', '', { expires: new Date() });
			return (res.send({ status: "Success", token: this.authService.getTokenByUser(req["user"]["user"]) }));
		}
		else
			return (res.send({ status: "Failure", token: "" }));
	}

	@Get('2fa/qrcode')
	@UseGuards(JwtAuthGuard)
	async streamQRCode(@Res() res: Response, @Req() req) {
		const file = createReadStream(join(process.cwd(), 'qrcode/' + req.user.user.email + '.png'));
		file.pipe(res);
	}

	@Post('2fa/verify')
	@UseGuards(Auth2fGuard)
	async verifyTwoFactorAuth(@Req() req: Request, @Body() body, @Res() res) {
		if (this.authService.isValidCode(req["user"].user, body.code)) {
			const tokens: string = await this.authService.getTokenByUser(req["user"].user);
			res.cookie('access_token', tokens, { httpOnly: true, sameSite: "lax" });
			return (res.send({ status: "Success", token: tokens }));
		}
		else
			return (res.send({ status: "Failure", token: "" }));
	}

	@Get('2fa/status')
	@UseGuards(JwtAuthGuard)
	getTwoFactorAuthStatus(@Req() req: any) {
		return (req.user.user.auth2f);
	}

	@Get('2fa/completeStatus')
	@UseGuards(JwtAuthGuard)
	getTwoFactorAuthSetupStatus(@Req() req: any) {
		return ({ "activated": req.user.user.auth2f, "generated": req.user.user.auth2fSecret != "" });
	}

	@Post('/refresh')
	@UseGuards(JwtAuthGuard)
	async refreshToken(@Req() req, @Res({ passthrough: true }) res: Response) {
		const tokens: string = await this.authService.getTokenByUser(req["user"]["user"]);
		res.cookie('access_token', tokens, { httpOnly: true, sameSite: "lax" });
		res.send({ "token": tokens });
	}
}
