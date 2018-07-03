var LocalStrategy = require('passport-local').Strategy;
var User = require(__dirname+'/schema.js');
var nodemailer = require('nodemailer');
var sendinBlue = require('nodemailer-sendinblue-transport');
var transporter = nodemailer.createTransport(sendinBlue({
	apiKey: 'KznDtBjdQH0sJc2a'
}))

module.exports = function(sd) {
	// Initialize
		sd.transporter = transporter;
		var router = sd._initRouter('/api/user');
	// Report
		var sendReport = function(){
			var jsonData = {
				html: sd._fs.readFileSync(__dirname + '/client/mails/report.html', 'utf8')
			}
			sd._parallel([function(next){
				User.find({}, function(err, users){
					jsonData.html=jsonData.html.replace('USERS', users.length);
					next();
				});
			},function(next){
				sd.Db.find({}, function(err, dbs){
					jsonData.html=jsonData.html.replace('DATABASES', dbs.length);
					var bytes = 0;
					for (var i = 0; i < dbs.length; i++) {
						for (var j = 0; j < dbs[i].collections.length; j++) {
							if(dbs[i].collections[j].size) bytes+=parseInt(dbs[i].collections[j].size);
						}
					}
					if(!bytes) return next();
					if(bytes<1024){
						jsonData.html=jsonData.html.replace('USAGE', parseInt(bytes) + ' B');
						return next();
					}
					bytes /= 1024;
					if(bytes<1024){
						jsonData.html=jsonData.html.replace('USAGE', parseInt(bytes) + ' KB');
						return next();
					}
					bytes /= 1024;
					if(bytes<1024){
						jsonData.html=jsonData.html.replace('USAGE', parseInt(bytes) + ' MB');
						return next();
					}
					bytes /= 1024;
					if(bytes<1024){
						jsonData.html=jsonData.html.replace('USAGE', parseInt(bytes) + ' GB');
						return next();
					}
					bytes /= 1024;
					if(bytes<1024){
						jsonData.html=jsonData.html.replace('USAGE', parseInt(bytes) + ' TB');
						return next();
					}
					bytes /= 1024;
					jsonData.html=jsonData.html.replace('USAGE', parseInt(bytes) + ' PB');
					next();
				});
			}], function(){
				transporter.sendMail({
					from: 'LamaDB Admin <noreply@lamadb.com>',
					to: sd._config.report,
					subject: 'LamaDB Report',
					html: jsonData.html
				}, function(err) {});
			});
		}
		require('ontime')({
			cycle: '12:00:00'
		}, function(ot) {
			sendReport();
			return ot.done();
		});
	// Login
		router.post('/login', sd._passport.authenticate('local-login', {
			successRedirect: '/',
			failureRedirect: '/'
		}));
		sd._passport.use('local-login', new LocalStrategy({
			usernameField : 'username',
			passwordField : 'password',
			passReqToCallback : true
		}, function(req, username, password, done) {
			User.findOne({
				'email': username.toLowerCase()
			}, function(err, user) {
				if (err) return done(err);
				if (!user||!user.validPassword(password)){
					req.session.notFound = true
					return done(null, false);
				}return done(null, user);
			});
		}));
	// Sign up
		router.post('/signup', sd._passport.authenticate('local-signup', {
			successRedirect: '/',
			failureRedirect: '/'
		}));
		sd._passport.use('local-signup', new LocalStrategy({
			usernameField : 'username',
			passwordField : 'password',
			passReqToCallback : true
		}, function(req, username, password, done) {
			User.findOne({
				'email': username.toLowerCase()
			},function(err, user) {
				if (err) return done(err);
				if (user){
					req.session.exists = true;
					return done(null, false);
				}else {
					transporter.sendMail({
						from: 'LamaDB Support <noreply@lamadb.com>',
						to: username,
						subject: 'Welcome on LamaDB',
						html: sd._fs.readFileSync(__dirname+'/client/mails/welcome.html', 'utf8')
					}, function(err) {});
					var newUser = new User();
					newUser.email = username;
					newUser.password = newUser.generateHash(password);
					newUser.save(function(err) {
						if (err) throw err;
						return done(null, newUser);
					});
				}
			});
		}));
	// End of Crud
};

