#!/usr/bin/env node

module.exports = function(ctx) {
  var path = ctx.requireCordovaModule('path');
  var et = ctx.requireCordovaModule('elementtree');
  var ConfigParser = ctx.requireCordovaModule(
    'cordova-common/src/ConfigParser/ConfigParser'
  );
  var configFile = path.resolve(ctx.opts.projectRoot, 'config.xml');
  var config = new ConfigParser(configFile);

  function setHook(config, hookSrc, type) {
    var hook = config.doc.find('hook[@src="' + hookSrc + '"]');
    if (!hook) {
      hook = new et.Element('hook');
      hook.attrib.src = hookSrc;
      config.doc.getroot().append(hook);
    }
    hook.attrib.type = type;

    config.write();
  }

  setHook(config, 'hooks/__realm/createRealmModels.js', 'before_build');
};
