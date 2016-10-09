var exec = require('cordova/exec');
var RealmNativeInstance = require('./RealmNativeInstance');
var Types = require('./Types');

function onInitSuccess(success) {
    return function(realmObjectID) {
        success(new RealmNativeInstance(realmObjectID));
    };
}

function Realm() {}

/**
 * @param configuration 
 */
Realm.init = function(configuration, success, error) {
    exec(onInitSuccess(success), error, 'RealmPlugin', 'initialize', [ configuration ]);
};

module.exports = {
    Realm: Realm,
    Case: Types.Case.enum,
    Sort: Types.Sort.enum
};
