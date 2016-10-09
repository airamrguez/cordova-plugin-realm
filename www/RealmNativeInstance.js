var exec = require('cordova/exec');
var QueryBuilder = require('./QueryBuilder');

function RealmNativeInstance(realmObjectID) {
    this.realmObjectID = realmObjectID;
}

RealmNativeInstance.prototype = {
    write: function(schemaName, json, success, error) {
        exec(success, error, 'RealmPlugin', 'write', [this.realmObjectID, schemaName, json]);
    },
    where: function(schemaName) {
        return new QueryBuilder(this.realmObjectID, schemaName);
    }
};

module.exports = RealmNativeInstance;
