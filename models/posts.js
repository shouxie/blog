const Post = require('../lib/mongo').Post;
const CommentModel = require('./comments');
const marked = require('marked');

Post.plugin('contentToHtml', {
	afterFind: function(posts) {
		return posts.map(function(post) {
			post.content = marked(post.content);
			return post;
		})
	},
	afterFindOne: function(post) {
		if (post) {
			post.content = marked(post.content);
		}
		return post;
	}
})

Post.plugin('addCommentsCount', {
	afterFind: function(posts) {
		return Promise.all(posts.map(function(post) {
			return CommentModel.getCommentsCount(post._id).then(function(commentsCount) {
				post.commentsCount = commentsCount;
				return post;
			});
		}))
	},
	afterFindOne: function(post) {
		if (post) {
			return CommentModel.getCommentsCount(post._id).then(function(count) {
				post.commentsCount = count;
				return post;
			});
		}
	}
})

module.exports = {
	// 创建一篇文章
	create: function create(post) {
		return Post.create(post).exec();
	},
	// 通过文章id 获取一篇文章
	getPostById: function getPostBtId(postId) {
		return Post
			.findOne({ _id: postId })
			.populate({ path: 'author', model: 'User' })
			.addCreatedAt()
			.addCommentsCount()
			.contentToHtml()
			.exec()
	},
	// 按创建时间降序获取所有用户文章或者某个特定用户的所有文章
	getPosts: function getPosts(author) {
		const query = {};
		if (author) {
			query.author = author;
		}
		return Post
			.find(query)
			.populate({ path: 'author', model: 'User' })
			.sort({ _id: -1 })
			.addCreatedAt()
			.addCommentsCount()
			.contentToHtml()
			.exec()
	},
	// 通过文章id 给pv加1
	incPv: function incPv(postId) {
		return Post
			.update({ _id: postId}, { $inc: { pv: 1 } })
	},
	// 通过文章id获取一篇原生文章（编辑文章）
	getRawPostById: function getRawPostById(postId) {
		return Post
			.findOne({ _id: postId })
			.populate({ path: 'author', model: 'User' })
			.exec()
	},
	// 通过文章id 更新一篇文章
	updatePostById: function updatePostById(postId, data) {
		return Post.update({ _id: postId}, { $set: data }).exec();
	},
	// 通过文章id 删除一篇文章
	delPostById: function delPostById(postId, author) {
		return Post.deleteOne({ author: author, _id: postId })
			.exec()
			.then(function(res) {
				if (res.result.ok && res.result.n > 0) {
					return CommentModel.delCommentsByPostId(postId);
				}
			})
		// return Post.deleteOne({ _id: postId}).exec();
	}
}