
<template>
	
<div class="connection">
	<div class="co-42">
   		<button @click="$redirect('/auth/42/login')" type="button" class="btn42">
      	<img class="logo42" src="../assets/img/42.png" alt="logo 42">
   		</button>
	</div>
	<div class= "co-email">
		<span class="text">Authentication</span>
		<div class="form">
			<input class="field" type="email" id="email" placeholder="Email / User Name" v-model="email" />
			<input class="field" type="password" placeholder="Password" v-model="password" />
			<button @click="login">Login</button>
		</div>
		<div class="inscription">
			<button id="inscription-btn" @click="showModal = true">Sign Up</button>
		</div>
		<Teleport to="body">
			<inscription :show="showModal" @close="showModal = false" />
		</Teleport>
	</div>
</div>

</template>

<style scoped>

.connection {
	min-height: 350px;
	
	height: 100vh;
	width: 100vw;
	display: flex;
	flex-direction: row;
	gap: 20px;
	justify-content: space-around;
	align-items: center;
	
}
.co-42 {
	width: 12%;
	aspect-ratio: 1;
	max-width: 300px;
	padding: 40px 30px;
	background-color: pink;
	background: #EBECF0;
	border-radius: 10px;
	box-shadow: 4px 4px 4px #474747, -4px -4px 4px #eaeaea;
	display: flex;
	justify-content: center;
	align-items: center;
}

.co-42 .logo42 {
	max-width: 100%;
	max-height: 100%;
}

.co-email {
	display: flex;
	flex-direction: column;
	width: 35%;
	max-width: 500px;
	height: 400px;
	padding: 40px 30px;
	gap: 20px;
	background: #EBECF0;
	
	border-radius: 10px;
	box-shadow:  4px 4px 4px #474747,
	-4px -4px 4px #eaeaea;
}

.co-email .text {
	font-size: clamp(1.25rem, 0.4808rem + 2.4615vw, 2.25rem);
	font-weight: 600;
	display: flex;
	align-items: center;
	flex-direction: column;
	margin-bottom: 35px;
	color: #595959;
}



.btn42 {
	display: block;
	margin-top: 0.5px;
	margin-left: 0.5px;
	margin-right: 0.5px;
	--border-radius: 25px;
	--border-width: 1px;
	appearance: none;
	position: relative;
	padding: 0.1em 0.1em;
	border: 0;
	background: none;
	font-family: "Roboto", Arial, "Segoe UI", sans-serif;
	font-size: 10px;
	font-weight: 500;
	color: #fff;
	z-index: 2;
}

.inscription {
	display: flex;
	direction: row;
	justify-content: center;
}

#inscription-btn {
	margin-top: 10px;
	width: 80%;
	max-width: 300px;
	height: 50px;
	font-size: 18px;
	line-height: 50px;
	font-weight: 600;
	background: #dde1e7;
	border-radius: 25px;
	border: none;
	outline: none;
	cursor: pointer;
	color: #595959;
	box-shadow:  4px 4px 4px #616161,
	-4px -4px 4px #eaeaea;
}

#inscription-btn:focus {
	color: #3498db;
	box-shadow:  4px 4px 4px #606060,
	-4px -4px 4px #c9c9c9;
}

.btn42::after {
	box-sizing: border-box;
}

.btn42:focus {
	color: black;
	;
	
}

.form button {
	margin-top: 10px;
	width: 80%;
	max-width: 300px;
	height: 50px;
	font-size: 18px;
	line-height: 50px;
	font-weight: 600;
	background: #dde1e7;
	border-radius: 25px;
	border: none;
	outline: none;
	cursor: pointer;
	color: #595959;
	box-shadow:  4px 4px 4px #616161,
	-4px -4px 4px #eaeaea;
}
.form button:focus {
	color: #3498db;
	box-shadow:  4px 4px 4px #606060,
	-4px -4px 4px #c9c9c9;
}

.form {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 20px;
}

.field {
	font-size: clamp(1rem, 0.8077rem + 0.6154vw, 1.25rem);
	width: 80%;
	max-width: 350px;
	padding-left: 10px;
	padding-right: 10px;
	height: 50px;
	outline: none;
	border: none;
	background: #dde1e7;
	color: #595959;
	border-radius: 25px;
	box-shadow: inset 2px 2px 5px #BABECC,
	inset -5px -5px 10px #ffffff73;
}

.field:focus{
	box-shadow: inset 1px 1px 2px #BABECC,
	inset -1px -1px 2px #ffffff73;
}
.field button {
	margin: 15px 0;
	width: 100%;
	height: 50px;
	font-size: 18px;
	line-height: 50px;
	font-weight: 600;
	background: #dde1e7;
	border-radius: 25px;
	border: none;
	outline: none;
	cursor: pointer;
	color: #595959;
	box-shadow:  4px 4px 4px #616161,
	-4px -4px 4px #eaeaea;
}
.field button:focus {
	color: #3498db;
	box-shadow:  4px 4px 4px #606060,
	-4px -4px 4px #c9c9c9;
}

</style>


<script setup>

import {ref} from "vue"
import inscription from "@/components/auth/inscription.vue"
import { useNotification } from "@kyvg/vue3-notification";
import router from '../router'

const email = ref('')
const password = ref('')
const showModal = ref(false)

sessionStorage.removeItem('channel_id');

async function login(){
	const res = await fetch("http://" + import.meta.env.VITE_HOST + ":3000/auth/login",
	{
		credentials: 'include',
		method: 'post',
		mode: "cors",
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			email: email.value,
			password: password.value

		})
	})
	switch (res.status) {
		case 406:{
			const response = await res.json();
			const notification = useNotification()
			notification.notify({
				title: response["message"],
				type: 'error',
				group: 'notif-center'
			});
			break;
		}
		case 401:{
			const notification = useNotification()
			notification.notify({
				title: "Wrong Password !",
				type: 'error',
				group: 'notif-center'
			});
			break;
		}
		case 201:{
			router.push('/home');
			break;
		}
		case 207:{
			router.push({path:'/auth/2fa/verif'});
			break;
		}
	}
}

</script>