var PRIMITIVE_TYPES = [
  'bool',
  'int',
  'float',
  'double',
  'string',
  'data',
  'date'
];

function isPrimitive(propType) {
  return PRIMITIVE_TYPES.some(function(type) {
    return type === propType;
  });
}

// When the schema comes from the realm lib, the type field
// is stored in objectType when the property is an object and
// the type has the value of object.
// For example if the schema defined by the user is { type: 'Car' }
// the returned schema from the realm lib is { objectType: 'Car', type: 'object' }
function getPropType(property) {
  if (typeof property === 'string') {
    return /(\[\])/g.test(property) ? 'list' : property.replace(/\?/, '');
  }
  return property.objectType || property.type;
}

function iterateResults(results, cb) {
  if (Array.isArray(results)) {
    results.forEach(result => {
      cb(result);
    });
  } else {
    cb(results);
  }
}

function isNil(o) {
  return o === undefined || o === null;
}

function assertModelReferences(props, models) {
  if (props.length > 0 && models.length === 0) {
    // TODO: Add missing models in the error.
    var missingModels = props.reduce(function(result, prop) {
      if (
        models.find(function(model) {
          return model.name === prop.name;
        }) === undefined
      ) {
        result.push(prop);
      }
      return result;
    }, []);
    throw new Error(
      'could not find model definitions for ' + missingModels.join(', ')
    );
  }
}

var utils = {
  findModel: function(schema, modelName) {
    return schema.find(function(model) {
      return model.name === modelName;
    });
  },
  getInnerModels: function(model, schema, props) {
    return props.reduce(function(refs, prop) {
      var innerModel = utils.findModel(
        schema,
        getPropType(model.properties[prop])
      );
      if (innerModel !== undefined) {
        refs.push(innerModel);
      }
      return refs;
    }, []);
  },
  // @param {Model} model - A model with the properties.
  // @param {string} type - The type to filter the model properties.
  // @return {Array<Property>} Returns an array of properties which type matchs param type.
  getPropsOfType: function(model, type) {
    var properties = model.properties;
    return Object.keys(properties).filter(function(key) {
      var propType = getPropType(properties[key]);
      switch (type) {
        case 'object':
          return (
            propType !== 'list' &&
            propType !== 'linkingObjects' &&
            !isPrimitive(propType)
          );
        case 'list':
          if (propType === 'linkingObjects') {
            return true;
          }
          return propType === type;
        default:
          return propType === type;
      }
    });
  },
  normalizeDates: function(results, schema, model) {
    if (isNil(results) || (Array.isArray(results) && results.length === 0)) {
      return results;
    }

    // Convert string dates into date objects.
    var dateProperties = utils.getPropsOfType(model, 'date');
    dateProperties.forEach(function(prop) {
      iterateResults(results, function(result) {
        if (typeof result[prop] === 'string') {
          result[prop] = new Date(result[prop]);
        }
      });
    });

    // Normalize references.
    ['object', 'list'].forEach(type => {
      var props = utils.getPropsOfType(model, type);
      var innerModels = utils.getInnerModels(model, schema, props);

      innerModels.forEach(function(referencedModel, i) {
        iterateResults(results, function(result) {
          utils.normalizeDates(result[props[i]], schema, referencedModel);
        });
      });
    });

    return results;
  },
  retrocycle: function($) {
    // Source: https://github.com/douglascrockford/JSON-js
    // Restore an object that was reduced by decycle. Members whose values are
    // objects of the form
    //      {$ref: PATH}
    // are replaced with references to the value found by the PATH. This will
    // restore cycles. The object will be mutated.

    // The eval function is used to locate the values described by a PATH. The
    // root object is kept in a $ variable. A regular expression is used to
    // assure that the PATH is extremely well formed. The regexp contains nested
    // * quantifiers. That has been known to have extremely bad performance
    // problems on some browsers for very long strings. A PATH is expected to be
    // reasonably short. A PATH is allowed to belong to a very restricted subset of
    // Goessner's JSONPath.

    // So,
    //      var s = '[{"$ref":"$"}]';
    //      return JSON.retrocycle(JSON.parse(s));
    // produces an array containing a single element which is the array itself.

    var px = /^\$(?:\[(?:\d+|"(?:[^\\"\u0000-\u001f]|\\([\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*")\])*$/;

    (function rez(value) {
      // The rez function walks recursively through the object looking for $ref
      // properties. When it finds one that has a value that is a path, then it
      // replaces the $ref object with a reference to the value that is found by
      // the path.

      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach(function(element, i) {
            if (typeof element === 'object' && element !== null) {
              var path = element.$ref;
              if (typeof path === 'string' && px.test(path)) {
                value[i] = eval(path);
              } else {
                rez(element);
              }
            }
          });
        } else {
          Object.keys(value).forEach(function(name) {
            var item = value[name];
            if (typeof item === 'object' && item !== null) {
              var path = item.$ref;
              if (typeof path === 'string' && px.test(path)) {
                value[name] = eval(path);
              } else {
                rez(item);
              }
            }
          });
        }
      }
    })($);
    return $;
  }
};

module.exports = utils;
