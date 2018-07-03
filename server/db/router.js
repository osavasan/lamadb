var Db = require(__dirname+'/schema.js');
var mongoose = require('mongoose');
var Schema = mongoose.Schema({
	type: mongoose.Schema.Types.Mixed
}, {
	strict: false
});
module.exports = function(sd) {
	var router = sd._initRouter('/api/db');
	sd.Db = Db;
	var ensure = function(req, res, next){
		if(req.user) next();
		else res.json(false);
	}
	var ensureMineDatabase = function(req, res, next){
		Db.findOne({
			_id: req.body.database,
			author: req.user._id
		}, function(err, db){
			if(err||!db) return res.json(false);
			req.body.db = db;
			next();
		});
	}
	router.post("/create", ensure, function(req, res) {
		Db.create({
			name: req.body.name,
			author: req.user._id
		}, function(err, db){
			if(err||!db) return res.json(false);
			req.user.databases.push(db._id);
			req.user.save(function(){
				res.json(db);
			});
		});
	});
	router.post("/addCollection", ensure, ensureMineDatabase, function(req, res) {
		for (var i = 0; i < req.body.db.collections.length; i++) {
			if(req.body.db.collections[i].name == req.body.collection){
				return res.json(false);
			}
		}
		var newCollection = {
			_id: mongoose.Types.ObjectId(),
			name: req.body.collection
		}
		req.body.db.collections.push(newCollection);
		req.body.db.save(function(){
			res.json(newCollection);
		});
		var conn = mongoose.createConnection('localhost',"y" + req.body.db._id);
		conn.once('open', function() {
			var Schema = mongoose.Schema({});
			var Collection = conn.model(req.body.collection, Schema, req.body.collection);
			var doc = new Collection({});
			doc.save(function(){
				doc.remove(function(){});
			});
		});
	});
	router.post("/getCollection", ensure, ensureMineDatabase, function(req, res) {
		var conn = mongoose.createConnection('localhost',"y" + req.body.db._id);
		conn.once('open', function() {
			var Collection = conn.model(req.body.collection, Schema, req.body.collection);
			Collection.find(req.body.query||{}, function(err, docs){
				res.json(docs);
			});
		});
	});
	router.post("/saveDoc", ensure, ensureMineDatabase, function(req, res) {
		var conn = mongoose.createConnection('localhost',"y" + req.body.db._id);
		conn.once('open', function() {
			var Collection = conn.model(req.body.collection, Schema, req.body.collection);
			if(req.body.doc._id){
				Collection.remove({
					_id: req.body.doc._id
				}, function(){
					Collection.create(req.body.doc, function(){
						res.json(true);
					});
				});
			}else{
				Collection.create({},function(err, doc){
					res.json(doc);
				});
			}
		});
	});
	router.post("/removeDoc", ensure, ensureMineDatabase, function(req, res) {
		var conn = mongoose.createConnection('localhost',"y" + req.body.db._id);
		conn.once('open', function() {
			var Collection = conn.model(req.body.collection, Schema, req.body.collection);
			if(req.body.doc._id){
				Collection.remove({
					_id: req.body.doc._id
				}, function(err){
					res.json(true);
				});
			}else res.json(false);
		});
	});
	router.post("/calcDatabase", ensure, ensureMineDatabase, function(req, res) {
		var conn = mongoose.createConnection('localhost',"y" + req.body.db._id);
		conn.once('open', function() {
			conn.db.listCollections().toArray(function(err, names) {
				var exists = [];
				sd._each(names, function(obj, next) {
					var Collection = conn.model(obj.name, Schema, obj.name);
					Collection.collection.stats(function(err, results) {
						if (err || !results) return next();
						var needToAdd = true;
						for (var i = 0; i < req.body.db.collections.length; i++) {
							if (obj.name == req.body.db.collections[i].name) {
								exists.push(req.body.db.collections[i]._id);
								req.body.db.collections[i].size = results.storageSize;
								needToAdd = false;
								break;
							}
						}
						if (needToAdd) {
							var newCollection = {
								_id: sd._mongoose.Types.ObjectId(),
								name: obj.name,
								size: results.storageSize
							}
							req.body.db.collections.push(newCollection);
							exists.push(newCollection._id);
						}
						next();
					});
				}, function() {
					for (var i = req.body.db.collections.length - 1; i >= 0; i--) {
						var splice = true;
						for (var j = 0; j < exists.length; j++) {
							if(exists[j].toString()==req.body.db.collections[i]._id.toString()){
								splice = false;
								break;
							}
						}
						if(splice) req.body.db.collections.splice(i, 1);
					}
					req.body.db.save(function() {
						res.json(req.body.db.collections);
					});
				});
			});			
		});
	});
	router.post("/calcCollection", ensure, ensureMineDatabase, function(req, res) {
		var conn = mongoose.createConnection('localhost',"y" + req.body.db._id);
		conn.once('open', function() {
			for (var i = 0; i < req.body.db.collections.length; i++) {
				if(req.body.db.collections[i]._id==req.body.collection){
					var Collection = conn.model(req.body.db.collections[i].name, Schema, req.body.db.collections[i].name);
					Collection.collection.stats(function(err, results) {
						if(err||!results) return res.json(false);
						req.body.db.collections[i].size = results.storageSize;
						req.body.db.save(function(){
							res.json(req.body.db.collections[i]);
						});
					});
					return;
				}
			}
			res.json(false);
		});
	});
	router.post("/removeDatabase", ensure, function(req, res) {
		Db.findOne({
			_id: req.body._id,
			author: req.user._id
		}, function(err, db){
			if(err||!db) return res.json(false);
			Db.remove({
				_id: req.body._id,
				author: req.user._id
			}, function(){});
			var conn = mongoose.createConnection('localhost', "y" + req.body._id);
			conn.once('open', function() {
				conn.dropDatabase();
				res.json(false);
			});
		});		
	});
	router.post("/renameCollection", ensure, ensureMineDatabase, function(req, res) {
		var conn = mongoose.createConnection('localhost',"y" + req.body.db._id);
		conn.once('open', function() {
			for (var i = 0; i < req.body.db.collections.length; i++) {
				if(req.body.db.collections[i]._id==req.body.collection){
					var Collection = conn.model(req.body.db.collections[i].name, Schema, req.body.db.collections[i].name);
					Collection.collection.rename(req.body.newName);
					req.body.db.collections[i].name = req.body.newName;
					req.body.db.save(function() {
						res.json(true);
					});
					return;
				}
			}
			res.json(false);
		});
	});
	router.post("/removeCollection", ensure, ensureMineDatabase, function(req, res) {
		var conn = mongoose.createConnection('localhost',"y" + req.body.db._id);
		conn.once('open', function() {
			for (var i = 0; i < req.body.db.collections.length; i++) {
				if(req.body.db.collections[i]._id==req.body.collection){
					var Collection = conn.model(req.body.db.collections[i].name, Schema, req.body.db.collections[i].name);
					Collection.collection.drop(req.body.newName);
					req.body.db.collections.splice(i, 1);
					req.body.db.save(function() {
						res.json(true);
					});
					return;
				}
			}
			res.json(false);
		});
	});
};