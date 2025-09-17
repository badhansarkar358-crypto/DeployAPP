module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    fontFamily: {
      sans: ['PT Sans', 'sans-serif']
    },
    extend: {
      colors: {
        primary: '#FFA500',
        accent: '#800080',
        background: '#F5F5DC'
      },
      boxShadow: {
        card: '0 4px 24px 0 rgba(0,0,0,0.08)'
      }
    }
  },
  plugins: []
};
