module.exports = {
	host: '10.36.34.15',
	port: 3004,
	session: {
		secret: 'myblog',
		key: 'myblog',
		maxAge: 2592000000
	},
	mongodb: 'mongodb://localhost:27017/myblog'
}