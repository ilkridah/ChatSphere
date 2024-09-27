import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ChatService } from "../chat.service";
import { User } from "src/user/user.entity";

@Controller('chat')
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	@Get('/list')
	getChannels() {
		return (this.chatService.get_All());
	}

	@Get('/:name')
	async fetchByName(@Param('name') name: any) {
		let channel = null;
		if (!isNaN(name))
			channel = await this.chatService.get_ById(name);
		else {
			if (Array.from(name)[0] != '#')
				name = '#' + name;
			channel = await this.chatService.fetchByName(name);
		}
		return (channel);
	}

	@Post('/create')
	async create(@Body('name') name: string, @Body('password') password: string, @Body('creator') creator: User) {
		if (Array.from(name)[0] != '#')
			name = '#' + name;
		let channel;
		try {channel = await this.chatService.create(name, password, (password !== ''), creator);}
		catch {return (null);}
		return {
			message: 'channel created',
			channel
		};
	}

	@Post('/delete')
	async delete(@Body('name') name: string) {
		if (Array.from(name)[0] != '#')
			name = '#' + name;
		this.chatService.delete(name);
	}

	@Get('/:id/owner')
	async getOwner(@Param('id') id: number) {
		return (await this.chatService.get_ChannelOwner(id));
	}

	@Get('/:id/getUsers')
	async get_UsersInChannel(@Param('id') id: number) {
		return (await this.chatService.get_UsersInChannel(id));
	}

	@Post('/:id/addAdmin/:User_id')
	async addAdmin(@Param('id') id: number, @Param('User_id') User_id: number) {
		try {await this.chatService.add_AdminInChannel(id, User_id);}
		catch (e) {
			return {
				ok: false,
				message: e.message,
			}
		}
		return {
			ok: true,
			message: 'New admin added',
		}
	}

	@Post('/:id/removeAdmin/:User_id')
	async removeAdmin(@Param('id') id: number, @Param('User_id') User_id: number) {
		try {await this.chatService.delete_AdminInChannel(id, User_id)}
		catch (e) {
			return {
				ok: false,
				message: e.message,
			}
		}
		return {
			ok: true,
			message: 'admin removed from channel',
		}
	}

	@Post('/:channel_id/:User_id/delete_Password')
	async delete_Password(@Param('User_id') User_id: number, @Param('channel_id') channel_id: number) {
		try {await this.chatService.delete_Password(User_id, channel_id);}
		catch (e) {
			return {
				ok: false,
				message: e.message,
			};
		}
		return {
			ok: true,
			message: 'The password has been removed!',
		};
	}

	@Get('/:channel_id/Fetch_admins')
	async Fetch_admins(@Param('channel_id') channel_id: number) {
		return (await this.chatService.Fetch_admins(channel_id));
	}

	@Post('/:channel_id/:User_id/change_Password')
	async change_Password(@Param('User_id') User_id: number, @Param('channel_id') channel_id: number, @Body('password') password: string) {
		try {await this.chatService.change_Password(User_id, channel_id, password);}
		catch (e) {
			return {
				ok: false,
				message: e.message,
			};
		}
		return {
			ok: true,
			message: 'The password has been changed !',
		};
	}

	@Get('/:channel_id/is_UserInChannel/:User_id')
	async is_UserInChannel(@Param('channel_id') channel_id: number, @Param('User_id') User_id: number) {
		return (await this.chatService.is_UserInChannel(channel_id, User_id));
	}

	@Get('/:channel_id/is_UserBan/:User_id')
	async is_UserBan(@Param('channel_id') channel_id: number, @Param('User_id') User_id: number) {
		return (await this.chatService.is_UserBan(channel_id, User_id));
	}
}