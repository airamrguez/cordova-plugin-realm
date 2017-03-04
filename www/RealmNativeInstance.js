var exec = require('cordova/exec');
var QueryBuilder = require('./QueryBuilder');

/**
 * RealmNativeInstance keeps track of a native Realm instance.
 * @param {object} realm contains information about the native
 * realm instance.
 */
function RealmNativeInstance(config) {
  this.config = config;
}

RealmNativeInstance.prototype = {
  create: function(schemaName, json, update, success, error) {
    var realmInstanceID = this.config.realmInstanceID;
    exec(success, error, 'RealmPlugin', 'create', [
      realmInstanceID,
      schemaName,
      json,
      update
    ]);
  },
  deleteAll: function(success, error) {
    var realmInstanceID = this.config.realmInstanceID;
    exec(success, error, 'RealmPlugin', 'deleteAll', [realmInstanceID]);
  },
  where: function(schemaName) {
    return new QueryBuilder(this.config, schemaName);
  }
};

module.exports = RealmNativeInstance;
