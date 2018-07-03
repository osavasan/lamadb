var mongoose = require('mongoose');
var fs = require('fs');
var User = require(__dirname+'/schema.js');
module.exports = function(sd) {
	// Initialize
		var router = sd._initRouter('/api/user');
		if(mongoose.connection.readyState==0){
			mongoose.connect(sd._mongoUrl);
		}
		sd.User = User;
		sd._passport.serializeUser(function(user, done) {
			done(null, user.id);
		});
		sd._passport.deserializeUser(function(id, done) {
			User.findById(id, function(err, user) {
				done(err, user);
			});
		});
	// Support
		var ensure = function(req, res, next){
			if(req.user) next();
			else res.json(false);
		}
		router.post("/update", ensure, function(req, res) {
			req.user.update(req.body, function(err){
				if(err) return res.json(false);
				res.json(true);
			});
		});
		router.get("/logout", ensure, function(req, res) {
			req.logout();
			res.redirect('/');
		});
	// End of Crud
};


