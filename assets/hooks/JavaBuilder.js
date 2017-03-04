'use strict';

var utils = require('./utils');
var path = require('path');

var ANDROID_SRC_PATH = path.join(
  'io',
  'github',
  'airamrguez',
  'plugins',
  'realm'
);

function javaTypeForNonOptionalType(propType, schemas) {
  var type = propType.type;
  switch (type) {
    case 'bool':
      return 'boolean';
    case 'int':
      return 'int';
    case 'float':
      return 'float';
    case 'double':
      return 'double';
    case 'string':
      return 'String';
    case 'date':
      return 'Date';
    case 'list': {
      var objectType = propType.objectType;
      if (utils.typeExists(objectType, schemas)) {
        return 'RealmList<' + objectType + '>';
      }
      throw new Error('type ' + propType.objectType + ' not found in schema');
    }
    default: {
      if (utils.typeExists(type, schemas)) {
        return type;
      }
      throw new Error('unsupported type ' + type);
    }
  }
}

function javaTypeForOptionalType(type, schemas) {
  switch (type) {
    case 'bool':
      return 'Boolean';
    case 'int':
      return 'Integer';
    case 'float':
      return 'Float';
    case 'double':
      return 'Double';
    case 'string':
      return 'String';
    case 'date':
      return 'Date';
    default:
      return type;
  }
}

// List properties cannot be declared as optional or set to null.
function isPropertyList(propType) {
  return typeof propType === 'object' && propType.type === 'list';
}

function isSchemaProperty(propType, schemas) {
  return typeof propType === 'string' && utils.typeExists(propType, schemas) ||
    typeof propType === 'object' && utils.typeExists(propType.type, schemas);
}

// object properties are always optional and do not need an optional designation.
function isPropertyNullable(propType, schemas) {
  return typeof propType === 'object' &&
    (propType.optional || utils.typeExists(propType.type, schemas));
}

function javaType(propType, schemas) {
  if (typeof propType === 'string') {
    return javaTypeForNonOptionalType(
      {
        type: propType
      },
      schemas
    );
  } else if (typeof propType === 'object') {
    if (propType.optional && propType.type === 'list') {
      throw new Error(
        'A list type cannot be optional. Check propType ' + propType
      );
    }
    if (isPropertyNullable(propType, schemas)) {
      return javaTypeForOptionalType(propType.type, schemas);
    }
    return javaTypeForNonOptionalType(propType, schemas);
  }
  throw new Error('invalid property ' + propType);
}

function getRealmPackages(schema) {
  var realmPkgDir = 'io.realm.';
  var realmAnnotationPkgDir = realmPkgDir + 'annotations.';
  var packages = [];

  if (schema.primaryKey) {
    packages.push(realmAnnotationPkgDir + 'PrimaryKey');
  }

  var properties = schema.properties;
  if (properties) {
    Object.keys(properties).forEach(function(key) {
      var property = properties[key];
      if (typeof property === 'object') {
        if (property.indexed) {
          packages.push(realmAnnotationPkgDir + 'Index');
        }
        if (property.type === 'list') {
          packages.push(realmPkgDir + 'RealmList');
        } else if (property.type === 'date') {
          packages.push('java.util.Date');
        }
      } else if (typeof property === 'string') {
        if (property === 'date') {
          packages.push('java.util.Date');
        }
      }
    });
  }

  return packages;
}

function getTagForProperty(schema, propName, propValue) {
  if (schema.primaryKey === propName) {
    return '@PrimaryKey';
  }
  if (typeof propValue === 'object') {
    if (propValue.indexed) {
      return '@Index';
    }
  }
  return '';
}

// FIXME Deeper deps.
function getSchemaDependencies(schemaName, dependencies) {
  return dependencies.adjacentsForNode(schemaName).map(function(node) {
    return node;
  });
}

function renderModelClass(template, schema, schemas, dependencies) {
  return template({
    packages: getRealmPackages(schema),
    schema: schema,
    getTagForProperty: getTagForProperty,
    javaType: function(propValue) {
      return javaType(propValue, schemas);
    },
    getSchemaDependencies: function(schema) {
      return getSchemaDependencies(schema, dependencies);
    },
    capitalize: utils.capitalize
  });
}

function renderSerializerClass(template, schema, schemas) {
  return template({
    schema: schema,
    isPropertyList: isPropertyList,
    isSchemaProperty: function(propType) {
      return isSchemaProperty(propType, schemas);
    },
    isPropertyNullable: function(propType) {
      return isPropertyNullable(propType, schemas);
    },
    javaType: function(propValue) {
      return javaType(propValue, schemas);
    },
    capitalize: utils.capitalize
  });
}

function writeClassFile(paths, clazz, schema) {
  paths.forEach(function(targetDest) {
    utils.writeFile(targetDest, clazz, function(err) {
      if (err) {
        throw new Error('could not write schema ' + schema.name);
      }
      console.info('Created ', targetDest);
    });
  });
}

function JavaBuilder(project, schemas, dependencyGraph) {
  this.project = project;
  this.schemas = schemas;
  this.dependencyGraph = dependencyGraph;
}

JavaBuilder.prototype.generateSourceFiles = function() {
  var project = this.project;
  var schemas = this.schemas;
  var dependencies = this.dependencyGraph;
  var androidPackageDir = path.resolve(
    project.projectRoot,
    'platforms',
    'android',
    'src',
    ANDROID_SRC_PATH
  );
  var pluginDestDir = path.join(
    project.pluginSrcDir,
    'android',
    ANDROID_SRC_PATH
  );
  var modelTpl = utils.getTemplate('Java');
  var serializerTpl = utils.getTemplate('JavaSerializer');

  schemas.forEach(function(schema) {
    var modelClass = renderModelClass(modelTpl, schema, schemas, dependencies);
    var serializerClass = renderSerializerClass(serializerTpl, schema, schemas);
    var modelClassFileName = schema.name + '.java';
    var serializerClassFileName = schema.name + 'Serializer.java';
    writeClassFile(
      [
        path.join(pluginDestDir, modelClassFileName),
        path.join(androidPackageDir, modelClassFileName)
      ],
      modelClass,
      schema
    );
    writeClassFile(
      [
        path.join(pluginDestDir, serializerClassFileName),
        path.join(androidPackageDir, serializerClassFileName)
      ],
      serializerClass,
      schema
    );
  });
};

module.exports = JavaBuilder;
