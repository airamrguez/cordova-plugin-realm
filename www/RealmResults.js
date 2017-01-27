var exec = require('cordova/exec');
var checkArgs = require('./checkArgs');
var Types = require('./Types');

/**
 * setProps makes a result instance behaves like an array.
 * @param {RealmResults} result instance.
 * @param {Array<Object>} nextResults new objects to be added.
 */
function setProps(result, nextResults) {
  var prevSize = result.length || 0;
  var nextSize = nextResults.length;
  var props = {};
  var i;

  for (i = prevSize; i < nextSize; i++) {
    props[i] = (function(index) {
      return {
        get: function() {
          return nextResults[index];
        },
        set: function(value) {
          nextResults[index] = value;
        },
        enumerable: true,
        configurable: true
      };
    })(i);
  }
  for (i = nextSize; i < prevSize; i++) {
    delete result[i];
  }
  for (i = 0; i < prevSize; i++) {
    result[i] = nextResults[i];
  }

  props.length = {
    value: nextResults.length,
    configurable: true
  };

  Object.defineProperties(result, props);
}

function findSchema(schemas, schemaName) {
  return schemas.find(function(schema) {
    return schema.name === schemaName;
  });
}

function getPropertiesOfType(schema, type) {
  var properties = schema.properties;
  return Object.keys(properties).filter(function(key) {
    return properties[key].type === type;
  });
}

function getInnerSchemas(schema, schemas, objectProperties) {
  return objectProperties.map(function(prop) {
    return findSchema(schemas, schema.properties[prop].objectType);
  });
}

function normalize(results, schemas, schema) {
  var dateProperties = getPropertiesOfType(schema, 'date');
  dateProperties.forEach(function(prop) {
    results.forEach(function(result) {
      result[prop] = new Date(result[prop]);
    });
  });
  var objectProperties = getPropertiesOfType(schema, 'object');
  var objectInnerSchemas = getInnerSchemas(schema, schemas, objectProperties);
  objectInnerSchemas.forEach(function(innerSchema, i) {
    results.forEach(function(result) {
      normalize([result[objectProperties[i]]], schemas, innerSchema);
    });
  });
  var listProperties = getPropertiesOfType(schema, 'list');
  var listInnerSchemas = getInnerSchemas(schema, schemas, listProperties);
  listInnerSchemas.forEach(function(innerSchema, i) {
    results.forEach(function(result) {
      normalize(result[objectProperties[i]], schemas, innerSchema);
    });
  });
  return results;
}

/**
 * onResultChange recompose results into the result instance every time that
 * there is an update on the native result instance.
 * @param  {RealmResults} result instance.
 * @param  {Array<Objects>} nextResults results returned from the native
 * RealmResults instance.
 */
function onResultChange(result, nextResults) {
  setProps(result, nextResults);
  if (result.onChange) {
    result.onChange(result);
  }
}

/**
 * RealmResults constructor
 * @param {int} realmResultsId identifies a RealmResult native instance.
 * @param {Array<Object>} results objects to be added to the RealmResults object.
 */
function RealmResults(realm, schemaName, realmResultsId, results) {
  Object.defineProperty(this, 'realm', {
    value: realm
  });
  Object.defineProperty(this, 'realmResultsId', {
    value: realmResultsId
  });
  Object.defineProperty(this, 'schemaName', {
    value: schemaName
  });

  var schemas = realm.schemas;
  var schema = findSchema(schemas, schemaName);
  if (!schema) {
    throw new Error(schemaName + ' schema not found');
  }
  setProps(this, normalize(results, schemas, schema));

  [
    'every',
    'find',
    'findIndex',
    'forEach',
    'join',
    'map',
    'reduce',
    'reduceRight',
    'slice',
    'some'
  ].forEach(function(method) {
    RealmResults.prototype[method] = function() {
      var args = Array.prototype.slice.call(arguments);
      return results[method].apply(this, args);
    };
  });

  // var changesChannel = 'results/' + realmResultsId;
  // this.changeSubscription = PubSub.subscribe(changesChannel, function(nextResults) {
  //   onResultChange(this, nextResults);
  // });
}

/**
 * onResultsSuccess is called when the native RealmResult are successfully created.
 * @param  {RealmResults} result instance.
 * @param  {function} success function to return back the results.
 * @return {function} that calls the user success function.
 */
function onResultsSuccess(result, success) {
  return function(nextResults) {
    setProps(result, nextResults);
    success(result);
  };
}

var resultMethods = {
  sum: {
    signatures: [
      [Types.string, Types.func]
    ]
  },
  min: {
    signatures: [
      [Types.string, Types.func]
    ]
  },
  max: {
    signatures: [
      [Types.string, Types.func]
    ]
  },
  average: {
    signatures: [
      [Types.string, Types.func]
    ]
  },
  sort: {
    signatures: [
      [Types.string, Types.func],
      [Types.string, Types.func, Types.bool],
      [Types.string, Types.Sort, Types.func],
      // Last bool param indicates update native realm results.
      [Types.string, Types.Sort, Types.func, Types.bool]
    ]
  }
};

// TODO Check args only in development mode.
Object.keys(resultMethods).forEach(function(method) {
  RealmResults.prototype[method] = function() {
    var args = Array.prototype.slice.call(arguments);
    var signatures = resultMethods[method].signatures;
    var validArgs = checkArgs(args, signatures);
    var success = args[args.length - 1];
    if (validArgs) {
      exec(
        // onResultsSuccess(this, success), <- TODO: Delete this
        success,
        null,
        'RealmPlugin',
        method,
        [this.realmResultsId].concat(args)
      );
    } else {
      throw new Error(
        'invalid arguments supplied to method ' + method +
        '. The query will not be executed.'
      );
    }
  };
});

module.exports = RealmResults;
