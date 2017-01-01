var exec = require('cordova/exec');
var QueryBuilder = require('./QueryBuilder');

/**
 * RealmNativeInstance keeps track of a native Realm instance.
 * @param {number} realmObjectID identifier of the native Realm instance.
 */
function RealmNativeInstance(realmObjectID) {
  this.realmObjectID = realmObjectID;
}

RealmNativeInstance.prototype = {
  insert: function(schemaName, json, success, error) {
    exec(
      success,
      error,
      'RealmPlugin',
      'insert',
      [this.realmObjectID, schemaName, json]
    );
  },
  deleteAll: function(success, error) {
    exec(
      success,
      error,
      'RealmPlugin',
      'deleteAll',
      [this.realmObjectID]
    );
  },
  where: function(schemaName) {
    return new QueryBuilder(this.realmObjectID, schemaName);
  }
};

module.exports = RealmNativeInstance;
