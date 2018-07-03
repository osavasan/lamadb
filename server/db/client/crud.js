/*
* Crud file for client side db
*/
crudServices.Db = function($http, $timeout, socket){
	// Initialize
		var srv = {};
	// Routes
		srv.create = function(obj, callback){
			$http.post('/api/db/create', obj||{})
			.then(function(resp){
				if(resp.data&&typeof callback == 'function'){
					callback(resp.data);
				}else if(typeof callback == 'function'){
					callback(false);
				}
			});
		}
		srv.update = function(obj, callback){
			if(!obj) return;
			$timeout.cancel(obj.updateTimeout);
			if(!obj.name) obj.name='';
			if(socket) obj.print = socket.id;
			$http.post('/api/db/update'+obj.name, obj)
			.then(function(resp){
				if(resp.data&&typeof callback == 'function'){
					callback(resp.data);
				}else if(typeof callback == 'function'){
					callback(false);
				}
			});		
		}
		srv.updateAfterWhile = function(obj, callback){
			$timeout.cancel(obj.updateTimeout);
			obj.updateTimeout = $timeout(function(){
				srv.update(obj, callback);
			}, 1000);
		}
		srv.delete = function(obj, callback){
			if(!obj) return;
			if(socket) obj.print = socket.id;
			$http.post('/api/db/delete', obj)
			.then(function(resp){
				if(resp.data&&typeof callback == 'function'){
					callback(resp.data);
				}else if(typeof callback == 'function'){
					callback(false);
				}
			});
		}
	// Sockets
		socket.on('DbUpdate', function(db){
			if(!db.print||db.print==socket.id) return;
			if(typeof srv.DbUpdate == 'function'){
				srv.DbUpdate(db);
			}
		});
		socket.on('DbDelete', function(db){
			if(!db.print||db.print==socket.id) return;
			if(typeof srv.DbDelete == 'function'){
				srv.DbDelete(db);
			}
		});
	// End of service
	return srv;
}