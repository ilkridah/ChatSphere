<template>
	<div class="not-found-page">
	  <div class="not-found-container">
		<h1>404</h1>
		<p>Page Not Found</p>
		<router-link to="/" class="home-link">Go Back Home</router-link>
	  </div>
	</div>
  </template>
  
  <script>
  export default {
	name: "NotFoundComponent",
  };
  </script>
  
  <style scoped>
  .not-found-page {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100vh;
	background-image: url(./assets/img/home1.png);
	background-repeat: no-repeat;
	background-size: cover; 
	z-index: -1; 
  }
  .not-found-container {
	max-width: 600px; 
	padding: 40px;
	background-color: #fff; 
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
	text-align: center;
	border-radius: 10px; 
  }
  .not-found-container h1 {
	font-size: 6rem;
	margin: 0 0 20px 0; 
  }
  .not-found-container p {
	font-size: 2rem;
  }
  .home-link {
	display: inline-block;
	margin-top: 20px;
	padding: 10px 15px;
	background-color: #007bff;
	color: #fff;
	text-decoration: none;
	border-radius: 5px;
  }
  </style>
  