import { Controller, Post, Body, Delete, Get, Query, Patch, Param } from '@nestjs/common';
import { FriendService } from './friend.service';
import { friendDto } from './dtos/friend.dto';

@Controller('friend')
export class FriendController {
	constructor(private friendService: FriendService) { }

	@Post('/add')
	async add_Friend(@Body() friendDto: friendDto) {
		return await this.friendService.add_Friend(friendDto.username, friendDto.sender);
	}

	@Patch('/accept')
	async accept_Friend(@Query('id1') id1: number, @Query('id2') id2: number) {
		return await this.friendService.accept_Friend(id1, id2);
	}

	@Delete('/delete')
	async delete_Friend(@Query('id1') id1: number, @Query('id2') id2: number) {
		return await this.friendService.delete_Friend(id1, id2);
	}

	@Get('/:id/list')
	async Get_Friend(@Param('id') id: number) {
		if (isNaN(id))
			return ([]);
		return await this.friendService.Get_Friend(id);
	}

	@Post('/is_Friend')
	async is_Friend(@Body() friendDto: friendDto) {
		return await this.friendService.is_Friend(friendDto.username, friendDto.sender);
	}
}
