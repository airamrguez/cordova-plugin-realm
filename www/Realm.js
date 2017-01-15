var exec = require('cordova/exec');
var RealmNativeInstance = require('./RealmNativeInstance');
var Types = require('./Types');

/**
 * onInitSuccess called when the native instance has been successfully created.
 * @param  {function} success will be called with a RealmNativeInstance that
 * keeps track of the native Realm instance.
 * @return {[type]}         [description]
 */
function onInitSuccess(success) {
  return function(realm) {
    success(new RealmNativeInstance(realm));
  };
}

/**
 * Realm constructor
 */
function Realm() {}

/**
 * init initializes a new Realm object.
 * @param  {Object} configuration passed to the native Realm constructor.
 * @param  {function} success call when the Realm native instance has been
 * successfully created.
 * @param  {function} error called when there is an error instantiating the
 * Realm native object.
 */
Realm.init = function(configuration, success, error) {
  exec(
    onInitSuccess(success),
    error,
    'RealmPlugin',
    'initialize',
    [configuration]
  );
};

module.exports = {
  Realm: Realm,
  Case: Types.Case.enum,
  Sort: Types.Sort.enum
};
