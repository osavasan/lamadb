var controllers = {};
app.controller(controllers);
var filters = {};
app.filter(filters);
controllers.DBManager=function($scope, $http, $timeout, $interval){
	"ngInject";
	var sd = $scope.sd = {
		status: []
	};
	/*
	*	Collections Management
	*/
		$scope.alerts = []; 
		angular.element(document).bind('keyup', function(e) {
			if(e.keyCode==27) $scope.hideEdits();
			$timeout();
		});
		$scope.hideEdits = function(exeptID){
			for (var i = 0; i < sd.databases.length; i++) {
				for (var j = 0; j < sd.databases[i].collections.length; j++) {
					if(sd.databases[i].collections[j]._id!=exeptID)
						sd.databases[i].collections[j].edit = false;
				}
			}
		}
		$scope.removeDatabase = function(db, index){
			sd.databases.splice(index, 1);
			if(sd.database._id == db._id){
				if(sd.databases.length>0){
					sd.database = sd.databases[0];
				}else delete sd.database;
			};
			var alert = {
				id: Date.now(),
				undo: function(){
					sd.databases.splice(index, 0, db);
					for (var i = 0; i < $scope.alerts.length; i++) {
						if($scope.alerts[i].id==alert.id){
							$scope.alerts.splice(i, 1);
							break;
						}
					}
					$interval.cancel(alert.interval);
				},
				message: 'Deleting '+db.name+' database.',
				sec: 15
			}
			$scope.alerts.push(alert);
			alert.interval = $interval(function(){
				if(--alert.sec<=0){
					for (var i = 0; i < $scope.alerts.length; i++) {
						if($scope.alerts[i].id==alert.id){
							$scope.alerts.splice(i, 1);
							break;
						}
					}
					$interval.cancel(alert.interval);
					$http.post('/api/db/removeDatabase', db);
				}
			}, 1000);
		}
		$scope.selectDocuments = function(db, collection){
			sd.database = db||sd.databases[0];
			if(sd.database){
				sd.database.show = true;
				sd.database.collection = true;
			}
			sd.collection = collection;
			if(!sd.collection||!sd.collection.name||!sd.database._id) return;
			delete sd.index;
			$http.post('/api/db/getCollection',{
				database: sd.database._id,
				collection: sd.collection.name
			}).then(function(resp){
				sd.docs = resp.data;
				if(sd.query_editor) sd.query_editor.session.setValue(JSON.stringify({}).replace('}','\n}'));
			});
		}
		$scope.renameCollection = function(db, collection){
			collection.edit=false;
			if(!collection.newName) return;
			$http.post('/api/db/renameCollection', {
				database: db._id,
				collection: collection._id,
				newName: collection.newName
			}).then(function(resp) {
				if (resp.data) {
					collection.name = collection.newName;
				}
			});
		}
		$scope.removeCollection = function(db, collection, index){
			db.collections.splice(index, 1);
			if (sd.collection._id == collection._id) {
				if (db.collections.length > 0) {
					sd.collection = db.collections[0];
				} else delete sd.collection;
			};
			var alert = {
				id: Date.now(),
				undo: function(){
					db.collections.splice(index, 0, collection);
					for (var i = 0; i < $scope.alerts.length; i++) {
						if($scope.alerts[i].id==alert.id){
							$scope.alerts.splice(i, 1);
							break;
						}
					}
					$interval.cancel(alert.interval);
				},
				message: 'Deleting '+collection.name+' collection.',
				sec: 10
			}
			$scope.alerts.push(alert);
			alert.interval = $interval(function(){
				if(--alert.sec<=0){
					for (var i = 0; i < $scope.alerts.length; i++) {
						if($scope.alerts[i].id==alert.id){
							$scope.alerts.splice(i, 1);
							break;
						}
					}
					$interval.cancel(alert.interval);
					$http.post('/api/db/removeCollection', {
						database: db._id,
						collection: collection._id
					});
				}
			}, 1000);
		}
		$scope.createNewCollection = function(){
			if(!sd.newCollection) return;
			if(sd.database.collections.length>=10){
				sd.manyCollections = false;
				$timeout(function(){
					sd.manyCollections = true;
					$timeout.cancel(sd.manyCollectionsTO);
					sd.manyCollectionsTO = $timeout(function(){
						sd.manyCollections = false;
					}, 4000);
				}, 200);
				return;
			}
			$http.post('/api/db/addCollection',{
				database: sd.database._id,
				collection: sd.newCollection
			}).then(function(resp){
				if(resp.data){
					sd.newCollection='';
					sd.database.collections.push(resp.data);
					sd.database.show = true;
					$scope.selectDocuments(sd.database, resp.data);
				}else{
					alert('That collection cannot be created.');
				}
			});
		}
	/*
	*	Docs Management
	*/
		$scope.removeDoc = function(doc, index){
			if(sd.index==index){
				if(sd.docs.length==1){
					$scope.selectDocuments($scope.database);
				}else{
					sd.index = 0;
					sd.setNewDoc(sd.docs[0]);
				}
			}
			sd.docs.splice(index,1);
			var alert = {
				id: Date.now(),
				undo: function(){
					sd.collections.splice(index, 0, doc);
					for (var i = 0; i < $scope.alerts.length; i++) {
						if($scope.alerts[i].id==alert.id){
							$scope.alerts.splice(i, 1);
							break;
						}
					}
					$interval.cancel(alert.interval);
				},
				message: 'Deleting doc with _id: '+doc._id,
				sec: 5
			}
			$scope.alerts.push(alert);
			alert.interval = $interval(function(){
				if(--alert.sec<=0){
					for (var i = 0; i < $scope.alerts.length; i++) {
						if($scope.alerts[i].id==alert.id){
							$scope.alerts.splice(i, 1);
							break;
						}
					}
					$interval.cancel(alert.interval);
					$http.post('/api/db/removeDoc', {
						database: sd.database._id,
						collection: sd.collection.name,
						doc: doc
					});
				}
			}, 1000);
		}
		$scope.createDoc = function(){
			if(!sd.collection||!sd.collection.name||!sd.database._id) return;
			$http.post('/api/db/saveDoc',{
				database: sd.database._id,
				collection: sd.collection.name,
				doc: {}
			}).then(function(resp){
				if(resp.data){
					sd.docs.push(resp.data);
					sd.setNewDoc(resp.data);
				}
			});	
		}
		$scope.saveDoc = function(){
			if(!sd.collection||!sd.collection.name||!sd.database._id) return;
			if(sd._editor){
				if(isJson(sd._editor.session.getValue())){
					sd.docs[sd.index] = JSON.parse(sd._editor.session.getValue());
					$http.post('/api/db/saveDoc',{
						database: sd.database._id,
						collection: sd.collection.name,
						doc: sd.docs[sd.index]
					}).then(function(resp){
						if(resp.data){
							sd.status[sd.index].save = true;
							sd.status[sd.index].noSaveNeed = true;
							$timeout(function(){
								sd.status[sd.index].save = false;
							}, 500);
						}
					});	
				}
			}
		}
		sd.docChanged = function(){
			if(!sd.status[sd.index]) sd.status[sd.index]={};
			sd.status[sd.index].noSaveNeed = false;
			if(!sd.collection||!sd.collection.name||!sd.database._id) return sd.status[sd.index].noSave = true;
			if(sd._editor){
				if(isJson(sd._editor.session.getValue())){
					sd.status[sd.index].noSave = false;
				}else sd.status[sd.index].noSave = true;
			}
		}
		sd.setNewDoc = function(doc){
			if(sd._editor){
				var newValue = JSON.stringify(doc).replace('{','{\n\t').replace('}','\n}').replace(new RegExp(',', 'g'), ',\n\t');
				sd._editor.session.setValue(newValue);
			}
		}
		sd.aceLoaded = function(_editor){
			sd._editor = _editor;
			_editor.session.setValue(JSON.stringify(sd.docs[sd.index]).replace('{','{\n\t').replace('}','\n}').replace(new RegExp(',', 'g'), ',\n\t'));
		}
		function isJson(str) {
			try {
				JSON.parse(str);
			} catch (e) {
				return false;
			}
			return true;
		}
		sd.queryLoaded = function(_editor){
			sd.query_editor = _editor;
			_editor.session.setValue(JSON.stringify({}).replace('}','\n}'));
		}
		$scope.querySearch = function(){
			if(sd.query_editor){
				if(isJson(sd.query_editor.session.getValue())){
					var query = JSON.parse(sd.query_editor.session.getValue());
					$http.post('/api/db/getCollection', {
						database: sd.database._id,
						collection: sd.collection.name,
						query: query
					}).then(function(resp) {
						sd.docs = resp.data;
						delete sd.index;
					});
				}
			}
		}
		sd.searchChanged = function(){
			if(sd.query_editor){
				if(isJson(sd.query_editor.session.getValue())){
					sd.disableSearch = false;
				}else sd.disableSearch = true;
			}
		}
	/*
	*	Charts
	*/
		$scope.createDB = function(name){
			if(!name) return;
			if(sd.databases.length>=5){
				sd.manyDatabases = false;
				$timeout(function(){
					sd.manyDatabases = true;
					$timeout.cancel(sd.manyDatabasesTO);
					sd.manyDatabasesTO = $timeout(function(){
						sd.manyDatabases = false;
					}, 4000);
				}, 200);
				return;
			}
			for (var i = 0; i < sd.databases.length; i++) {
				if(sd.databases[i].name.toLowerCase() == name.toLowerCase()) {
					sd.sameNameDatabase = false;
					$timeout(function(){
						sd.sameNameDatabase = true;
						$timeout.cancel(sd.sameNameDatabaseTO);
						sd.sameNameDatabaseTO = $timeout(function(){
							sd.sameNameDatabase = false;
						}, 4000);
					}, 200);
					return;
				}
			}
			$scope.newDBname = '';
			$http.post('/api/db/create',{
				name: name
			}).then(function(resp){
				if(resp.data){
					sd.databases.push(resp.data);
					$scope.selectDocuments(resp.data);
				}
			});
		}
		$scope.setDBsize = function(db){
			db.size = 0;
			for (var i = 0; i < db.collections.length; i++) {
				if(db.collections[i].size){
					db.size+=db.collections[i].size;
				}
			}
		}
		$scope.calcDatabase = function(db){
			$http.post('/api/db/calcDatabase',{
				database: db._id
			}).then(function(resp){
				if(resp.data){
					for (var j = 0; j < resp.data.length; j++) {
						var needToAdd = true;
						for (var i = 0; i < db.collections.length; i++) {
							if(resp.data[j]._id == db.collections[i]._id){
								db.collections[i].exists = true;
								db.collections[i].size = resp.data[j].size;
								needToAdd = false;
								break;
							}
						}
						if(needToAdd){
							resp.data[j].exists = true;
							db.collections.push(resp.data[j]);
						}
					}
					for (var i = db.collections.length - 1; i >= 0; i--) {
						if(db.collections[i].exists) continue;
						db.collections.splice(i,1);
					}
					$scope.setDBsize(db);
				}
			});
		}
		$scope.calcCollection = function(db, collection){
			$http.post('/api/db/calcCollection',{
				database: db._id,
				collection: collection._id
			}).then(function(resp){
				if(resp.data){
					collection.size = resp.data.size;
					$scope.setDBsize(db);
				}
			});
		}
	/*
	*	End of file
	*/
};
filters.calcStorage = function(){
	return function(bytes){
		if(!bytes) return '0 B';
		if(bytes<1024) return parseInt(bytes) + ' B';
		bytes /= 1024;
		if(bytes<1024) return parseInt(bytes) + ' KB';
		bytes /= 1024;
		if(bytes<1024) return parseInt(bytes) + ' MB';
		bytes /= 1024;
		if(bytes<1024) return parseInt(bytes) + ' GB';
		bytes /= 1024;
		if(bytes<1024) return parseInt(bytes) + ' TB';
		bytes /= 1024;
		return parseInt(bytes) + ' PB';
	}
}