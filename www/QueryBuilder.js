var exec = require('cordova/exec');
var Types = require('./Types');
var RealmResults = require('./RealmResults');
var checkArgs = require('./checkArgs');

/**
 * QueryBuilder constructor
 * @param {object} config an object to keep track of the native
 * instance
 * @param {string} schemaName is the name of the schema that should have been
 * defined inside the realmrc.json file.
 */
function QueryBuilder(config, schemaName) {
  this.config = config;
  this.schemaName = schemaName;
  this.ops = [];
  this.valid = true;
}

/**
 * appendOperation adds a new entry in the operation collection.
 * @param  {Array<Operation>} collection of operations to conform a query.
 * @param  {string} name is the operation name. E.g: equal, greaterThan, ...
 * @param  {Arguments} originalArgs are the arguments of the operation.
 * @param  {boolean} validation keeps track whether the collection of operations
 * is syntactically correct.
 * TODO Check args only in development mode.
 */
function appendOperation(collection, name, originalArgs, validation) {
  var args = Array.prototype.slice.call(originalArgs);
  var validArgs = checkArgs(args, validation.signatures);
  if (validArgs) {
    collection.push({
      name: name,
      args: args
    });
  } else {
    this.valid &= validArgs;
    throw new Error(
      'invalid arguments supplied to method ' + name +
      '. The query will be aborted.'
    );
  }
}

var queryMethods = {
  beginGroup: {
    signatures: [
      []
    ]
  },
  beginsWith: {
    signatures: [
      [Types.string, Types.string],
      [Types.string, Types.string, Types.Case]
    ]
  },
  between: {
    signatures: [
      [Types.string, Types.Date, Types.Date],
      [Types.string, Types.number, Types.number]
    ]
  },
  contains: {
    signatures: [
      [Types.string, Types.string],
      [Types.string, Types.string, Types.Case]
    ]
  },
  endGroup: {
    signatures: [
      []
    ]
  },
  endsWith: {
    signatures: [
      [Types.string, Types.string],
      [Types.string, Types.string, Types.Case]
    ]
  },
  equalTo: {
    signatures: [
      [Types.string, Types.bool],
      [Types.string, Types.number],
      [Types.string, Types.string],
      [Types.string, Types.string, Types.Case]
    ]
  },
  greaterThan: {
    signatures: [
      [Types.string, Types.Date],
      [Types.string, Types.number]
    ]
  },
  greaterThanOrEqualTo: {
    signatures: [
      [Types.string, Types.Date],
      [Types.string, Types.number]
    ]
  },
  in: {
    signatures: [
      [Types.string, Types.arrayOf(Types.bool)],
      [Types.string, Types.arrayOf(Types.Date)],
      [Types.string, Types.arrayOf(Types.number)],
      [Types.string, Types.arrayOf(Types.string)],
      [Types.string, Types.arrayOf(Types.string), Types.Case]
    ]
  },
  isEmpty: {
    signatures: [
      [Types.string]
    ]
  },
  isNotEmpty: {
    signatures: [
      [Types.string]
    ]
  },
  isNotNull: {
    signatures: [
      [Types.string]
    ]
  },
  isNull: {
    signatures: [
      [Types.string]
    ]
  },
  lessThan: {
    signatures: [
      [Types.string, Types.Date],
      [Types.string, Types.number]
    ]
  },
  lessThanOrEqualTo: {
    signatures: [
      [Types.string, Types.Date],
      [Types.string, Types.number]
    ]
  },
  not: {
    signatures: [
      []
    ]
  },
  notEqualTo: {
    signatures: [
      [Types.string, Types.bool],
      [Types.string, Types.number],
      [Types.string, Types.string],
      [Types.string, Types.string, Types.Case]
    ]
  },
  or: {
    signatures: [
      []
    ]
  },
  limit: {
    signatures: [
      [Types.number]
    ]
  },
  offset: {
    signatures: [
      [Types.number]
    ]
  }
};

Object.keys(queryMethods).forEach(function(method) {
  QueryBuilder.prototype[method] = function() {
    appendOperation(this.ops, method, arguments, queryMethods[method]);
    return this;
  };
});

/**
 * onExecuteSuccess wraps the result from the native call and creates a
 * RealmResult object with it.
 * @param  {function} success function.
 * @return {RealmResults} wrapping the results that comes from the native call.
 */
function onExecuteSuccess(queryBuilder, success) {
  return function(data) {
    // Delete method does not return anything.
    if (data) {
      return success(new RealmResults(queryBuilder, data.realmResultsId, data.results));
    }
    return success();
  };
}

// Append execution queries
var executionQueries = {
  findAll: {
    signatures: [
      [Types.func]
    ]
  },
  findAllSorted: {
    signatures: [
      [Types.string, Types.func],
      [Types.string, Types.Sort, Types.func],
      [Types.arrayOf(Types.string), Types.arrayOf(Types.Sort), Types.func]
    ]
  },
  delete: {
    signatures: [
      [Types.func]
    ]
  }
};

/* TODO Check args only in development mode. */
Object.keys(executionQueries).forEach(function(method) {
  QueryBuilder.prototype[method] = function() {
    if (!this.valid) {
      // An exception should have been thrown.
      return;
    }
    var args = Array.prototype.slice.call(arguments);
    var signatures = executionQueries[method].signatures;
    var validArgs = checkArgs(args, signatures);
    var success = args[args.length - 1];
    if (validArgs) {
      var realmInstanceID = this.config.realmInstanceID;
      exec(onExecuteSuccess(this, success), null, 'RealmPlugin', method, [
        realmInstanceID,
        this.schemaName,
        this.ops
      ]);
    } else {
      throw new Error(
        'invalid arguments supplied to method ' + method +
        '. The query will not be executed.'
      );
    }
  };
});

module.exports = QueryBuilder;
