'use strict';

var utils = require('./utils');
var path = require('path');

function objectiveCTypeForNonOptionalType(propType, schemas) {
  var type = propType.type;
  switch (type) {
    case 'bool':
      return 'BOOL ';
    case 'int':
      return 'NSInteger ';
    case 'float':
      return 'float ';
    case 'double':
      return 'double ';
    case 'string':
      return 'NSString *';
    case 'date':
      return 'NSDate *';
    case 'list':
      {
        var objectType = propType.objectType;
        if (utils.typeExists(objectType, schemas)) {
          return 'RLMArray<' + objectType + ' *><' + objectType + '> *';
        }
        throw new Error('type ' + propType.objectType + ' not found in schema');
      }
    default:
      {
        if (utils.typeExists(type, schemas)) {
          return type + ' *';
        }
        throw new Error('unsupported type ' + type);
      }
  }
}

function objectiveCTypeForOptionalType(type, schemas) {
  switch (type) {
    case 'bool':
      return 'NSNumber<RLMBool> *';
    case 'int':
      return 'NSNumber<RLMInt> *';
    case 'float':
      return 'NSNumber<RLMFloat> *';
    case 'double':
      return 'NSNumber<RLMDouble> *';
    case 'string':
      return 'NSString *';
    case 'date':
      return 'NSDate *';
    default:
      return type + ' *';
  }
}

/**
 * objectiveCType given a js type this function returns a equivalent objective-c type
 * @param {string} type is a javascript type.
 * @return {string} a equivalent objective-c type
 */
function objectiveCType(propType, schemas) {
  if (typeof propType === 'string') {
    return objectiveCTypeForNonOptionalType({
      type: propType
    }, schemas);
  } else if (typeof propType === 'object') {
    if (propType.optional && propType.type === 'list') {
      throw new Error('A list type cannot be optional. Check propType ' +
        propType
      );
    }
    // object properties are always optional and do not need an optional designation.
    if (propType.optional || utils.typeExists(propType.type, schemas)) {
      return objectiveCTypeForOptionalType(propType.type, schemas);
    }
    return objectiveCTypeForNonOptionalType(propType, schemas);
  }
  throw new Error('invalid property ' + propType);
}

function ObjcBuilder(project, schemas) {
  this.project = project;
  this.schemas = schemas;
}

ObjcBuilder.prototype.generateSourceFiles = function() {
  var project = this.project;
  var schemas = this.schemas;
  var iosProjectDir = path.resolve(
    project.projectRoot,
    'platforms',
    'ios',
    project.name,
    'Plugins',
    'cordova-plugin-realm'
  );
  var template = utils.getTemplate('Objc');
  var objectsModel = template({
    schemas: schemas,
    objectiveCType: objectiveCType
  });
  var ext = utils.getFileExtension('ios');
  var fileName = 'Models.' + ext;
  [
    path.join(project.pluginSrcDir, 'ios', fileName),
    path.join(iosProjectDir, fileName)
  ].forEach(function(targetDest) {
    utils.writeFile(targetDest, objectsModel, function(err) {
      if (err) {
        throw new Error('could not write schema ');
      }
      console.info('Created ', targetDest);
    });
  });
};

module.exports = ObjcBuilder;
