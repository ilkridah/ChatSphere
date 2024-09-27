<template>
	<button class="blue-button">
		<div class="blue-button-text" v-if="this.displayText"> 
			{{ this.text }}
		</div>
		<font-awesome-icon class="icon" v-if="this.icon" :icon="this.icon"/>
	</button>
</template>

<script lang="ts">

export default{
	props: {
		text: {
			type: String,
		},
		icon: {
			type: String,
		},
		displayText: {
			type: Boolean,
			default: true
		}
	}
}

</script>

<style>

.blue-button{
	position: relative;
	font-family: 'Poppins';
    font-weight: bold;
	font-size: clamp(0.625rem, 0.4861rem + 0.4444vw, 0.75rem);
	background-color: #0b2d39 ;
	border-radius: 10px;
	padding: 10px;
	background-repeat: no-repeat;
	box-sizing: border-box;
	color: #fff;
	display: flex;
	justify-content: center;
	align-items: center;
	border: none;
	transition: all .3s ease-in-out;
	overflow: hidden;
	overflow-wrap: break-word;
	cursor: pointer;
}


.blue-button-text{
	width: 100%;
}



.blue-button:hover::before {
	width: 100%;
	opacity: 50%;
} 

.icon{
	width: 30%;
}

</style>