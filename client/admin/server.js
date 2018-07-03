var uuidV4 = require('uuid/v4');
module.exports = function(app, sd) {
	/*
	*	Root
	*/
		app.get('/', function(req, res){
			if(req.user){
				sd.User.findOne({
					_id: req.user._id
				}).populate('databases')
				.lean()
				.select('-connection')
				.exec(function(err, user){
					user.ID = user._id.toString();
					res.render('Manage', user);
				});
			}else res.render('Auth');
			//}else res.render('Landing');
		});
		// app.get('/AboutUs', function(req, res){
		// 	res.render('AboutUs');
		// });
		// app.get('/OurWork', function(req, res){
		// 	res.render('OurWork');
		// });
		app.get('/Login', function(req, res){
			var obj = {
				notFound: req.session.notFound,
				exists: req.session.exists
			}
			delete req.session.notFound;
			delete req.session.exists;
			res.render('Auth', obj);
		});
		app.get('/Register', function(req, res){
			var obj = {
				notFound: req.session.notFound,
				exists: req.session.exists
			}
			delete req.session.notFound;
			delete req.session.exists;
			res.render('Auth', obj);
		});
	/*
	*	Recovery Process
	*/
		app.get('/Recovery', function(req, res){
			res.render('Recovery');
		});
		app.get('/Recovery/*', function(req, res){
			if(!req.params['0']||req.params['0']=='')
				return res.redirect('/');
			sd.User.findOne({
				code: req.params['0']
			}, function(err, user) {
				if (user) {
					res.render('Recovery', {
						code: req.params['0']
					});
				}else res.redirect('/');
			});
			
		});
		app.get('/EmailHasSend', function(req, res){
			res.render('EmailHasSend');
		});
		app.post('/ChangePass', function(req, res){
			sd.User.findOne({
				code: req.body.code
			}, function(err, user) {
				if(user){
					user.password = user.generateHash(req.body.password);
					user.code = '';
					user.save(function(){});
				}
			});
			res.redirect('/');
		});
		app.post('/Recovery', function(req, res){
			sd.User.findOne({
				email: req.body.email.toLowerCase()
			}, function(err, user) {
				if(user){
					if(!user.code){
						user.code = uuidV4();
						user.save(function(){});
					}
					sd.transporter.sendMail({
						from: 'LamaDB Support <noreply@lamadb.com>',
						to: req.body.email,
						subject: 'LamaDB Password Recovery',
						html: sd._fs.readFileSync(process.cwd()+'/server/user/client/mails/recovery.html', 'utf8').replace("CODE",user.code)
					}, function(err) {});
				}
			});
			res.redirect('/EmailHasSend');
		});
	/*
	*	API
	*/
		app.get('/api', function(req, res){
			res.render('Api');
		});
		app.get('/*', function(req, res){
			res.sendFile(__dirname+'/ace/'+req.params['0']);
		});
	/*
	*	END of routes
	*/
};