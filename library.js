var	async = require('async'),
	nconf = module.parent.require('nconf'),
	Topics = module.parent.require('./topics'),
	User = module.parent.require('./user'),
	Notifications = module.parent.require('./notifications'),
	Utils = module.parent.require('../public/src/utils'),
	websockets = module.parent.require('./websockets'),
	Mentions = {
		notify: function(postData) {
			var	_self = this,
				regex = /(@\b[\w\d\-_]+\b)/g,
				matches = postData.content.match(regex);

			if (matches) {
				async.filter(matches, function(match, next) {
					var	slug = match.slice(1);
					User.exists(slug, next);
				}, function(matches) {
					async.parallel({
						title: function(next) {
							Topics.getTopicField(postData.tid, 'title', next);
						},
						author: function(next) {
							User.getUserField(postData.uid, 'username', next);
						},
						uids: function(next) {
							async.map(matches, function(match, next) {
								var	slug = match.slice(1);
								User.get_uid_by_userslug(slug, next);
							}, next);
						}
					}, function(err, results) {
						if (!err) {
							Notifications.create('<strong>' + results.author + '</strong> mentioned you in "<strong>' + results.title + '</strong>"', '/topic/' + postData.tid, 'mention:' + postData.tid, function(nid) {
								Notifications.push(nid, results.uids);
							});
						}
					});
				});
			}
		},
		addMentions: function(postContent, callback) {
			var	_self = this,
				regex = /(@\b[\w\d\-_]+\b)/g,
				relativeUrl = nconf.get('relative_url') || '',
				matches = postContent.match(regex),
				uniqueMatches = [];

			if (matches) {
				// Eliminate duplicates
				matches.forEach(function(match) {
					if (uniqueMatches.indexOf(match) === -1) uniqueMatches.push(match);
				});

				// Filter out those that aren't real users
				async.filter(uniqueMatches, function(match, next) {
					var	slug = Utils.slugify(match.slice(1));
					User.exists(slug, next);
				}, function(matches) {
					if (matches) {
						postContent = postContent.replace(regex, function(match) {
							if (matches.indexOf(match) !== -1) {
								var	userslug = match.slice(1);
								return '<a class="plugin-mentions-a" href="' + relativeUrl + '/user/' + userslug + '"><i class="icon-user"></i> ' + match + '</a>';
							} else return match;
						});
						callback(null, postContent);
					} else callback(null, postContent);
				});
			} else callback(null, postContent);
		}
	};

module.exports = Mentions;
