'use strict';

var utils = require('./utils');
var path = require('path');

function generateSource(targetDest, templateName, schemas) {
  var template = utils.getTemplate(templateName);
  var objectsModel = template({
    schemas: schemas
  });
  utils.writeFile(targetDest, objectsModel, function(err) {
    if (err) {
      throw new Error('could not write schema @', targetDest);
    }
    console.info('Created ', targetDest);
  });
}

function BrowserBuilder(project, schemas) {
  this.project = project;
  this.schemas = schemas;
}

BrowserBuilder.prototype.generateSourceFiles = function() {
  var project = this.project;
  var schemas = this.schemas;
  var fileName = 'schemaProxy.js';
  var pluginBrowserPath = path.join('browser', 'client', fileName);
  var browserPlatformDir = path.resolve(
    project.projectRoot,
    'platforms',
    'browser',
    'www',
    'plugins',
    'cordova-plugin-realm',
    'src',
    pluginBrowserPath
  );
  var pluginDir = path.resolve(project.pluginSrcDir, pluginBrowserPath);
  generateSource(pluginDir, 'Browser', schemas);
  generateSource(browserPlatformDir, 'BrowserAMD', schemas);
};

module.exports = BrowserBuilder;
