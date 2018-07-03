/*
*	Crud file for client side user
*/
crudServices.User = function($http, $timeout, socket){
	// Initialize
	var srv = {},
		updateTimeout;
	// Routes
		srv.update = function(obj, callback){
			if(!obj) return;
			$timeout.cancel(updateTimeout);
			$http.post('/api/user/update', obj)
			.then(function(){
				if(typeof callback == 'function')
					callback();
				socket.emit('MineUserUpdated', obj);
			});		
		}
		srv.updateAfterWhile = function(obj){
			$timeout.cancel(updateTimeout);
			updateTimeout = $timeout(function(){
				srv.update(obj);
			}, 1000);
		}
		srv.delete = function(obj, callback){
			if(!obj) return;
			$http.post('/api/user/delete', obj)
			.then(function(){
				if(typeof callback == 'function')
					callback();
				socket.emit('MineUserDeleted', obj);
			});
		}
		srv.logout = function(callback){
			if(!obj) return;
			$http.post('/api/user/logout')
			.then(function(){
				if(typeof callback == 'function')
					callback();
			});
		}
		srv.changePassword = function(oldPass, newPass){
			if(!oldPass||!newPass) return;
			$http.post('/api/user/changePassword',{
				oldPass: oldPass,
				newPass: newPass
			}).then(function(resp){
				if(resp.data){
					socket.emit('MineUserUpdated', {
						logout: true
					});
				}
			});
		}
		srv.addLocalAccount = function(user, email, pass){
			if(!email||!pass) return;
			user.email = email;
			$http.post('/api/user/addLocalAccount',{
				email: email,
				password: pass
			}).then(function(resp){
				if(resp.data){
					socket.emit('MineUserUpdated', {
						email: email
					});
				}
			});
		}
		srv.changeAvatar = function(user, dataUrl){
			$timeout(function(){
				user.avatarUrl = dataUrl;
			});
			$http.post('/api/user/changeAvatar', {
				dataUrl: dataUrl
			}).then(function(resp){
				if(resp.data){							
					$timeout(function(){
						user.avatarUrl = resp.data;
						socket.emit('MineUserUpdated', {
							avatarUrl: resp.data
						});
					});
				}
			});
		}
	// Sockets
		socket.on('MineUserUpdated', function(user){
			if(user.logout) return srv.logout(function(){
				location.reload();
			});
			if(typeof srv.MineUserUpdated == 'function'){
				srv.MineUserUpdated(user);
			}
		});
		socket.on('MineUserDeleted', function(user){
			srv.logout(function(){
				location.reload();
			});
		});
	// End of service
	return srv;
}
/*
*	img service.
*/
services.Image = function($http){
	"ngInject";
	var obj = {};
	obj.resizeUpTo = function(info, callback){
		if(!info.file) return console.log('No image');
		info.width = info.width || 1920;
		info.height = info.height || 1080;
		if(info.file.type!="image/jpeg" && info.file.type!="image/png")
			return console.log("You must upload file only JPEG or PNG format.");
		var reader = new FileReader();
		reader.onload = function (loadEvent) {
			var ratioToFloat = function(val) {
				var r = val.toString(),
					xIndex = r.search(/[x:]/i);
				if (xIndex > -1) {
					r = parseFloat(r.substring(0, xIndex)) / parseFloat(r.substring(xIndex + 1));
				} else {
					r = parseFloat(r);
				}
				return r;
			};
			var canvasElement = document.createElement('canvas');
			var imageElement = document.createElement('img');
			imageElement.onload = function() {
				var ratioFloat = ratioToFloat(info.width/info.height);
				var imgRatio = imageElement.width / imageElement.height;
				if (imgRatio < ratioFloat) {
					width = info.width;
					height = width / imgRatio;
				} else {
					height = info.height;
					width = height * imgRatio;
				}
				canvasElement.width = width;
				canvasElement.height = height;
				var context = canvasElement.getContext('2d');
				context.drawImage(imageElement, 0, 0 , width, height);
				callback(canvasElement.toDataURL('image/png', 1));
			};
			imageElement.src = loadEvent.target.result;
		};
		reader.readAsDataURL(info.file);
	}
	return obj;
};
/*
*	MyUser service. Crud is required.
*/
services.MyUser = function(User, $http, $timeout){
	"ngInject";
	User.done = false;
	$http.get('/api/user/myUser')
	.then(function(resp){
		obj.done = true;
		obj.auth = resp.data.auth;
		obj.users = resp.data.users;
		if(obj.selectedUserCode) obj.selectUser(obj.selectedUserCode);
		if(obj.auth){
			obj.isAdmin = resp.data.isAdmin;
			obj.email = resp.data.email;
			obj.twitter = resp.data.twitter;
			obj.name = resp.data.name;
			obj.avatarUrl = resp.data.avatarUrl;
		}
	});
	obj.selectUser = function(code){
		obj.selectedUserCode = code;
		if(obj.users){
			for (var i = 0; i < obj.users.length; i++) {
				if(obj.users[i].userUrl==code||obj.users[i]._id==code){
					return obj.userSelected = obj.users[i];
				}
			}
		}
	}
	console.log(obj);
	return obj;
};
/*
*	End for User Crud.
*/