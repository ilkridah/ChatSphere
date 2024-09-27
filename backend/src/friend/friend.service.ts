import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from './friend.entity';
import { UserService } from '../user/user.service';
import { Channel } from 'src/chat/entities/channel.entity';
import { ChatService } from 'src/chat/chat.service';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/user.entity';


export interface friendTab {
	id: number;
	status: string;
	username: string;
	request: number;
	channel: Channel;
}

@Injectable()
export class FriendService {

	constructor(
		@InjectRepository(Friend)
		private friendRepository: Repository<Friend>,
		private userService: UserService,
		private chatService: ChatService,
	) { }

	
	async accept_Friend(id1: number, id2: number): Promise<void> {
		const friendship = await this.friendRepository.findOne({
			where: [
				{ User_id: id1, Friend_id: id2 },
				{ User_id: id2, Friend_id: id1 },
			],
		});
		if (!friendship)
			return;
		friendship.Status = 'accepted';
		await this.userService.add_UserToChannel(friendship.Friend_id, friendship.channel.id, '');
		await this.userService.add_UserToChannel(friendship.User_id, friendship.channel.id, '');
		await this.friendRepository.save(friendship);
	}

	async add_Friend(username: string, sender: number): Promise<string> {
		const friendToAdd = await this.userService.fetchByName(username);

		if (!friendToAdd) return ("This username does not exist !");
		if (friendToAdd.id === sender) return ("You cannot add yourself as a friend !");
		if (await this.get_Friend_id(friendToAdd.id, sender)) 
			return ("This user is already in your friends list !");

		const user: User = await this.userService.get_ById(sender);
		if (user.block_list.includes(friendToAdd.id)) return ("You cannot add a blocked user !");

		const friend = new Friend();
		friend.User_id = sender;
		friend.Friend_id = friendToAdd.id;
		friend.Status = 'pending';
		friend.channel = await this.chatService.create(await bcrypt.hash(`${friend.Friend_id}_${friend.User_id}`, 8), '', false, friendToAdd, true);
		await this.friendRepository.save(friend);
		return ('');
	}

	async delete_Friend(id1: number, id2: number): Promise<string> {
		let friendship = await this.friendRepository.findOne({ where: { User_id: id1, Friend_id: id2 } });
		if (!friendship)
			friendship = await this.friendRepository.findOne({ where: { User_id: id2, Friend_id: id1 } });
		if (!friendship)
			return;
		await this.chatService.delete(friendship.channel.name);
		await this.friendRepository.delete({ User_id: id1, Friend_id: id2 });
		await this.friendRepository.delete({ User_id: id2, Friend_id: id1 });
		return (friendship.channel.name);
	}

	async get_Friend_id(
		FriendToAdd: number,
		sender: number,
	): Promise<Friend | null> {
		return await this.friendRepository.findOne({
			where: [
				{ User_id: sender, Friend_id: FriendToAdd },
				{ User_id: FriendToAdd, Friend_id: sender },
			],
		});
	}

	async is_Friend(username: string, requester: number): Promise<boolean> {
		const friends = await this.Get_Friend(requester);
		for (var friend of friends) {
			if (friend.username === username)
				return (true);
		}
		return (false);
	}
	
	async get_FriendsFromUser(User_id: number): Promise<number[]> {
		if (isNaN(User_id))
			return ([]);
		const friendships = await this.friendRepository.find({
			where: [
				{ User_id: User_id },
				{ Friend_id: User_id },
			],
		});
		const friends = [];
		for (let friendship of friendships) {
			if (friendship.User_id === User_id)
				friends.push(friendship.Friend_id);
			else
			friends.push(friendship.User_id);
	}
	return (friends);
}

	async Get_Friend(id: number) {
		const friendships = await this.friendRepository.find({
			where: [
				{ User_id: id },
				{ Friend_id: id },
			],
		});
		let Friend_id: number;
		const friends: friendTab[] = [];
		for (let friendship of friendships) {
			if (friendship.User_id == id)
				Friend_id = friendship.Friend_id;
			else
				Friend_id = friendship.User_id;
			const friend: friendTab = {
				id: Friend_id,
				status: friendship.Status,
				username: (await this.userService.get_ById(Friend_id)).name,
				request: friendship.User_id,
				channel: friendship.channel,
			};
			friends.push(friend);
		}
		return friends;
	}

}