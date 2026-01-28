/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#002747",
        secondary: "#A4E4FF",
        light:{
          100: "",
          200: "",
          300: ""   
        },
        dark:{
          100:"",
          200:""
        },
        accent: "#FFFCA4"
      }
    },
  },
  plugins: [],
};
