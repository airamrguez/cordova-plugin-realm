#!/usr/bin/env node

'use strict';

module.exports = function(context) {
  var path = require('path');
  var Schema = require('./Schema');
  var JavaBuilder = require('./JavaBuilder');
  var ObjcBuilder = require('./ObjcBuilder');
  var BrowserBuilder = require('./BrowserBuilder');

  function getRealmrcDir(config, opts) {
    var content = config.doc.find('content');
    var contentSrc = content && content.attrib.src;
    return opts.plugin && contentSrc === 'cdvtests/index.html'
      ? opts.plugin.dir
      : opts.projectRoot;
  }

  var requireCdv = context.requireCordovaModule;
  var opts = context.opts;
  var projectRoot = opts.projectRoot;
  var ConfigParser = requireCdv('cordova-common/src/ConfigParser/ConfigParser');
  var configFile = path.resolve(projectRoot, 'config.xml');
  var config = new ConfigParser(configFile);
  var realmrc = require(path.join(getRealmrcDir(config, opts), 'realmrc.json'));
  var platforms = opts.cordova.platforms;
  var pluginSrcDir = path.resolve(
    projectRoot,
    'plugins',
    'cordova-plugin-realm',
    'src'
  );

  function createRealmModels() {
    var schemas = realmrc.schemas;
    if (!Array.isArray(schemas)) {
      return;
    }

    var schema = new Schema(schemas);
    var dependencyGraph = schema.createDependencyGraph();
    var sortedSchemas = schema.sortSchemas(dependencyGraph);
    var project = {
      name: config.name(),
      projectRoot: projectRoot,
      pluginSrcDir: pluginSrcDir
    };

    platforms.forEach(function(platform) {
      var builder = null;
      switch (platform) {
        case 'ios':
          builder = new ObjcBuilder(project, sortedSchemas);
          break;
        case 'android':
          builder = new JavaBuilder(project, sortedSchemas, dependencyGraph);
          break;
        case 'browser':
          builder = new BrowserBuilder(project, sortedSchemas);
          break;
        default:
          console.warn('Platform ', platform, ' is not supported.');
      }

      if (builder) {
        builder.generateSourceFiles();
      }
    });
  }

  createRealmModels();
};
