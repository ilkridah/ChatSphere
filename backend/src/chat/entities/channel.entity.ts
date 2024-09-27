import { User } from "src/user/user.entity";
import { Message } from "./message.entity";
import { Column, Entity, Generated, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

@Entity()
export class Channel {
	@PrimaryColumn()
	@Generated('increment')
	public id: number;

	@Column({ unique: true })
	public name: string;

	@ManyToMany(() => User, user => user.channels)
	users: User[];

	@Column({ default: '', nullable: false })
	public password: string;

	@Column({ default: false, nullable: false })
	public is_protected: boolean;

	@Column({ default: false, nullable: false })
	public is_private: boolean;

	@OneToMany(() => Message, message => message.channel, {
		cascade: true,
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE',
	})
	public messages: Message[];

	@ManyToOne(() => User, user => user.channels)
	@JoinColumn()
	public owner: User;

	@Column('int', { array: true, default: [] })
	public Banned_Users: number[];

	@Column('int', { array: true, default: [] })
	public admins: number[];
};