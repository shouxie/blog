/*
express web框架
express-session session中间件
connect-mongo 将session 存储于mongodb，结合express-session 使用
connect-flash 页面通知的中间件，基于session实现
ejs 模板
express-formidable 接收表单及文件上传的中间件
config-lite 读取配置文件
marked markdown解析
moment 时间格式化
mongolass mongodb驱动
objectid-to-timestamp 根据objectid 生成时间戳
sha1 sha1加密，用于密码加密
winston 日志
express-winston express的winston日志中间件

*/
/*
Restful 是一种api的设计风格，提出了一组 api的设计原则和约束条件

#### cookie 与 session 的区别
1. cookie 存储在浏览器（有大小限制），session 存储在服务端（没有大小限制）
2. 通常 session 的实现是基于 cookie 的，session id 存储于 cookie 中
3. session 更安全，cookie 可以直接在浏览器查看甚至编辑

```js
app.use(session(options))
```

session 中间件会在 req 上添加 session 对象，即 req.session 初始值为 `{}`，当我们登录后设置 `req.session.user = 用户信息`，返回浏览器的头信息中会带上 `set-cookie` 将 session id 写到浏览器 cookie 中，那么该用户下次请求时，通过带上来的 cookie 中的 session id 我们就可以查找到该用户，并将用户信息保存到 `req.session.user`。

## 4.4.3 页面通知

我们还需要这样一个功能：当我们操作成功时需要显示一个成功的通知，如登录成功跳转到主页时，需要显示一个 `登陆成功` 的通知；当我们操作失败时需要显示一个失败的通知，如注册时用户名被占用了，需要显示一个 `用户名已占用` 的通知。通知只显示一次，刷新后消失，我们可以通过 connect-flash 中间件实现这个功能。

[connect-flash](https://www.npmjs.com/package/connect-flash) 是基于 session 实现的，它的原理很简单：设置初始值 `req.session.flash={}`，通过 `req.flash(name, value)` 设置这个对象下的字段和值，通过 `req.flash(name)` 获取这个对象下的值，同时删除这个字段，实现了只显示一次刷新后消失的功能。

#### express-session、connect-mongo 和 connect-flash 的区别与联系

1. `express-session`: 会话（session）支持中间件
2. `connect-mongo`: 将 session 存储于 mongodb，需结合 express-session 使用，我们也可以将 session 存储于 redis，如 [connect-redis](https://www.npmjs.com/package/connect-redis)
3. `connect-flash`: 基于 session 实现的用于通知功能的中间件，需结合 express-session 使用


## 4.4.4 权限控制

可以把用户状态的检查封装成一个中间件，在每个需要权限控制的路由加载该中间件，即可实现页面的权限控制。在 myblog 下新建 middlewares 目录，在该目录下新建 check.js，添加如下代码：

*/
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');
const config = require('config-lite')(__dirname);
const routes = require('./routes');
const pkg = require('./package');
const winston = require('winston');
const expressWinston = require('express-winston');
const app = express();

// 设置模板目录
app.set('views', path.join(__dirname, 'views'));
// 设置模板引擎为ejs
app.set('view engine', 'ejs');

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));
// session 中间件
app.use(session({
	name: config.session.key, // 设置 cookie 中保存 session id 的字段名称
	secret: config.session.secret, // 通过设置secret 来计算 hash 值并存放在 cookie 中，使产生的 signedCookies 防篡改
	resave: true, // 强制更新cookie
	saveUninitialized: false, // 设置为false， 强制创建一个 session，即使用户未登录
	cookie: {
		maxAge: config.session.maxAge // 过期时间，过期后cookie 中的session id 自动删除
	},
	store: new MongoStore({ // 将session存储到mongodb
		url: config.mongodb // mongodb地址
	})
}))

// flash 中间件 用来显示通知
app.use(flash());

app.use(require('express-formidable')({
	uploadDir: path.join(__dirname, 'public/img'), // 上传图片路径
	keepExtensions: true // 保留后缀
}))


// 在调用 `res.render` 的时候，express 合并（merge）了 3 处的结果后传入要渲染的模板，优先级：`res.render` 传入的对象> `res.locals` 对象 > `app.locals` 对象，所以 `app.locals` 和 `res.locals` 几乎没有区别，都用来渲染模板，使用上的区别在于：`app.locals` 上通常挂载常量信息（如博客名、描述、作者这种不会变的信息），`res.locals` 上通常挂载变量信息，即每次请求可能的值都不一样（如请求者信息，`res.locals.user = req.session.user`）
// 路由
app.locals.blog = {
	title: pkg.name,
	description: pkg.description
}
app.use(function(req, res, next) {
	res.locals.user = req.session.user;
	res.locals.success = req.flash('success').toString();
	res.locals.error = req.flash('error').toString();
	next();
});

// 正常请求的日志
app.use(expressWinston.logger({
	transports: [
		new (winston.transports.Console)({
			json: true,
			colorize: true
		}),
		new winston.transports.File({
			filename: 'logs/success.log'
		})
	]
}))

routes(app);

// 错误的日志
app.use(expressWinston.errorLogger({
	transports: [
	new winston.transports.Console({
		json: true,
		colorize: true
	}),
	new winston.transports.File({
		filename: 'logs/error.log'
	})

	]
}))



app.use(function(err, req, res, next) {
	console.error(err);
	req.flash('error', err.message);
	res.redirect('/posts');
})
// 监听端口，启动程序
// app.listen(config.port, function() {
// 	console.log(`${pkg.name} listening on port ${config.port}`);
// })

if (module.parent) {
	// 被require ，则导出app
	module.exports = app;
} else {
	// 监听端口，启动程序
	app.listen(config.port, function() {
		console.log(`${pkg.name} listening on port ${config.port}`);
	})
}










