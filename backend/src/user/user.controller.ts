import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards, } from '@nestjs/common';
import { Response, Request } from 'express';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ChatService } from 'src/chat/chat.service';

@Controller('user')
export class UserController {
	constructor(
		private readonly userService: UserService,
		private readonly chatService: ChatService
	) { }

	@Get()
	async getUsers() {
		return (await this.userService.getAllUsers());
	}

	@Get('/me')
	@UseGuards(JwtAuthGuard)
	async me(@Req() req: Request) {
		if (!req["user"]["user"]) {
			return ({ error: true });
		}
		const id = req["user"]["user"]["id"];
		const user = await this.userService.get_ById(id);
		return (this.userService.getPartialUser(user));
	}

	@Get('/leaderboard')
	async getLeaderboardData() {
		return await this.userService.get_LeaderBoard();
	}

	@Get(":name")
	async getUserByName(@Param('name') name: string) {
		const user = await this.userService.fetchByName(name)
		if (!user)
			return (null);
		return (this.userService.getPartialUser(user));
	}

	
	@Get("/id/:id")
	async getUserById(@Param('id') id: number) {
		const user = await this.userService.get_ById(id);
		return (this.userService.getPartialUser(user));
	}


	@Get('/:User_id/joinedChannels')
	async get_JoinedChannels(@Param('User_id') User_id: number) {
		if (isNaN(User_id))
		return ([]);
		return (await this.userService.get_JoinedChannels(User_id));
	}
	
	@Get('/:User_id/block/block_list')
	async get_BlockList(@Param('User_id') User_id: number) {
		if (isNaN(User_id))
			return ([]);
		return (await this.userService.get_BlockList(User_id));
	}

	@Post('/setname')
	@UseGuards(JwtAuthGuard)
	async setUsername(@Req() req, @Body() body, @Res() res: Response) {
		if (! await this.userService.Update_username(req["user"]["user"]["email"], body["username"]))
			res.statusCode = 403;
		else
			res.statusCode = 201;
		res.send();
	}

	
	@Post('/:User_id/channels/:channel_id/add')
	async add_UserToChannel(@Param('User_id') User_id: number, @Param('channel_id') channel_id: number, @Body('password') password: string) {
		try {
			const channel = await this.chatService.get_ById(channel_id);
			if (channel?.is_private)
				throw new Error("You cannot make operations in a private channel.");
			await this.userService.add_UserToChannel(User_id, channel_id, password);
		}
		catch (e) {
			return {
				ok: false,
				message: e.message,
			};
		}
		return {
			ok: true,
			message: 'user added',
		};
	}

	@Post('/:User_id/channels/:channel_id/remove')
	async Rm_UserFromChannel(@Param('User_id') User_id: number, @Param('channel_id') channel_id: number) {
		const channel = await this.chatService.get_ById(channel_id);
		if (channel?.is_private)
			return ({
		ok: false,
				message: "You cannot make operations in a private channel.",
			});
		await this.userService.Rm_UserFromChannel(User_id, channel_id);
		return ({
			ok: true,
			message: 'User successfully removed from channel',
		});
	}

	@Post('/:User_id/channels/:channel_id/kick')
	async kick_UserFromChannel(@Param('User_id') User_id: number, @Param('channel_id') channel_id: number) {
		try {
			const channel = await this.chatService.get_ById(channel_id);
			if (channel?.is_private)
				throw new Error("You cannot make operations in a private channel.");
			await this.userService.kick_UserFromChannel(User_id, channel_id);
		}
		catch (e) {
			return {
				ok: false,
				message: e.message,
			}
		}
		return {
			ok: true,
			message: 'Excluded user !',
		}
	}

	@Post('/:User_id/channels/:channel_id/ban')
	async Ban_UserFromChannel(@Param('User_id') User_id: number, @Param('channel_id') channel_id: number) {
		try {
			const channel = await this.chatService.get_ById(channel_id);
			if (channel?.is_private)
				throw new Error("You cannot make operations in a private channel.");
			await this.userService.Ban_UserFromChannel(User_id, channel_id);
		}
		catch (e) {
			return {
				ok: false,
				message: e.message,
			}
		}
		return {
			ok: true,
			message: 'User banned!',
		}
	}

	@Post('/:User_id/channels/:channel_id/unban')
	async Unban_UserFromChannel(@Param('User_id') User_id: number, @Param('channel_id') channel_id: number) {
		await this.userService.Unban_UserFromChannel(User_id, channel_id);
	}


	@Post('/block/blocked')
	async block_User(@Body('User_id') User_id: number, @Body('blockId') blockId: number) {
		if (isNaN(User_id) || isNaN(blockId))
			return;
		return (await this.userService.block_User(User_id, blockId));
	}

	@Post('/isBlocked')
	async isUserBlocked(@Body('User_id') User_id: number, @Body('blockId') blockId: number) {
		if (isNaN(User_id))
			return (false);
		return ((await this.userService.get_BlockList(User_id)).includes(blockId));
	}

	@Patch('/block/unblock')
	async Unblock_User(@Body('User_id') User_id: number, @Body('unblockId') unblockId: number) {
		if (isNaN(User_id))
			return;
		return (await this.userService.Unblock_User(User_id, unblockId));
	}

}
