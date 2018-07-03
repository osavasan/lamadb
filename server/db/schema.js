var mongoose = require('mongoose');
var Schema = mongoose.Schema({
	name: String,
	author: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	collections: [{
		name: String,
		size: Number
	}],
	users: [{
		name: String
	}]
});

module.exports = mongoose.model('Db', Schema);
