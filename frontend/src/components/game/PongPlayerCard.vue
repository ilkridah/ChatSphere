<template>
	<div class="pongPlayerCard">
		<img alt="avatar" :src="user.avatar_Link" class="image" id="PongCardAvatar" draggable="false"/>
		<div class="pongPlayerCardText">
			{{ user.name }}
		</div>
	</div>
</template>

<script lang="ts">

export default {
	props: ["id", "side"],
	data() {
		return {user: Object};
	},
	mounted() {
		fetch("http://" + import.meta.env.VITE_HOST + ":3000/user/id/" + this.id, {credentials: 'include'})
		.then(res => res.json())
		.then(data => {this.user = data;});
	}
}

</script>

<style>

#PongCardAvatar{
	width: 40%;
}

.pongPlayerCard {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	border-radius: 10px;
}

.pongPlayerCardText {
	margin-top: 15px;
	font-size: 1.3vw;
}



.bounce-enter-active {
  animation: bounce-in 0.5s;
}
.bounce-leave-active {
  animation: bounce-in 0.5s reverse;
}
@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}

</style>

