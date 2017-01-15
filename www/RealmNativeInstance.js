var exec = require('cordova/exec');
var QueryBuilder = require('./QueryBuilder');

/**
 * RealmNativeInstance keeps track of a native Realm instance.
 * @param {object} realm contains information about the native
 * realm instance.
 */
function RealmNativeInstance(realm) {
  this.realm = realm;
}

RealmNativeInstance.prototype = {
  insert: function(schemaName, json, success, error) {
    var realmInstanceID = this.realm.realmInstanceID;
    exec(
      success,
      error,
      'RealmPlugin',
      'insert',
      [realmInstanceID, schemaName, json]
    );
  },
  deleteAll: function(success, error) {
    var realmInstanceID = this.realm.realmInstanceID;
    exec(
      success,
      error,
      'RealmPlugin',
      'deleteAll',
      [realmInstanceID]
    );
  },
  where: function(schemaName) {
    return new QueryBuilder(this.realm, schemaName);
  }
};

module.exports = RealmNativeInstance;
