<template>
	<div @click.stop>
		<button class="toggle_menu_button" @click="toggle"><font-awesome-icon icon="fa-solid fa-gear" /></button>
	</div>
	<Transition name="fade" mode="out-in">
		<div v-show="showMenu" class="menu_content" @click.stop>
			<button class="button_menu_channel" type="button" @click="$emit('leave_Channel'); toggle();">Leave Channel</button>
			<button class="button_menu_channel" v-if="isAdmin || isOwner" type="button" @click="$emit('displayChannelOption', 'ban')">Ban</button>
			<button class="button_menu_channel" v-if="isAdmin || isOwner" type="button" @click="$emit('displayChannelOption', 'unban')">UnBan</button>
			<button class="button_menu_channel" v-if="isOwner" type="button" @click="$emit('displayChannelOption', 'add_admin')">Add Admin</button>
			<button class="button_menu_channel" v-if="isOwner" type="button" @click="$emit('displayChannelOption', 'remove_admin')">Remove Admin</button>
			<button class="button_menu_channel" v-if="isOwner" type="button" @click="$emit('displayChannelOption', 'add_password')">{{isProtected ? "Modify" : "Add"}} Password</button>
			<button class="button_menu_channel" v-if="isOwner && isProtected" type="button" @click="$emit('delete_Password')">Remove Password</button>	
		</div>
	</Transition>
</template>
  
<script lang="ts">
	export default {
		props: ['showMenu', 'isProtected', 'isAdmin', 'isOwner'],
	data () {
		return {
			active: false
		}
	},
	methods: {
		toggle () {
				this.$emit('openMenu');
			}
		}
	}
</script>

<style>

.toggle_menu_button{
	margin: 15px;
	color: black;
	background-color: white;
	border: none;
	border-radius: 20px;
	cursor: pointer;
	font-size: clamp(1rem, 0.4231rem + 1.8462vw, 1.75rem);
}

.toggle_menu_button:hover {
	background-color: #d4eefd;
}

.toggle_menu_button:focus {
	background-color: #d4eefd;
}

.menu_content{
	position: absolute;
	display: flex;
	flex-direction: column;
	right: 0;
	top: 40px;
	background: white;
	border-radius: 20px;
	border: #515151 1px solid;
	padding: 10px;
	overflow: hidden;
	gap: 6px;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-out;
}

.button_menu_channel{
	background-color: #d4eefd;
	border: none;
	cursor: pointer;
	border-radius: 10px;
	font-weight: bold;
}

.button_menu_channel:hover{
	background-color: #9fcde7;
}

</style>