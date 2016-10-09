var exec = require('cordova/exec');
var Types = require('./Types');
var RealmResults = require('./RealmResults');
var checkArgs = require('./checkArgs');

function QueryBuilder(realmObjectID, schemaName) {
    this.realmObjectID = realmObjectID;
    this.schemaName = schemaName;
    this.ops = [];
    this.valid = true;
}

function appendOperation(collection, name, originalArgs, validation) {
    var args = Array.prototype.slice.call(originalArgs);
    // TODO Check args only in development mode.
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
    'beginGroup': { signatures: [[]] },
    'beginsWith': {
        signatures: [
            [Types.string, Types.string],
            [Types.string, Types.string, Types.Case]
        ]
    },
    'between': {
        signatures: [
            [Types.string, Types.Date, Types.Date],
            [Types.string, Types.number, Types.number],
        ]
    },
    'contains': {
        signatures: [
            [Types.string, Types.string],
            [Types.string, Types.string, Types.Case]
        ]
    },
    'count': { signatures: [[]] },
    'endGroup': { signatures: [[]] },
    'endsWith': {
        signatures: [
            [Types.string, Types.string],
            [Types.string, Types.string, Types.Case]
        ]
    },
    'equalTo': {
        signatures: [
            [Types.string, Types.bool],
            [Types.string, Types.number],
            [Types.string, Types.string],
            [Types.string, Types.string, Types.Case]
        ]
    },
    'greaterThan': {
        signatures: [
            [Types.string, Types.Date],
            [Types.string, Types.number]
        ]
    },
    'greaterThanOrEqualTo': {
        signatures: [
            [Types.string, Types.Date],
            [Types.string, Types.number]
        ]
    },
    'in': {
        signatures: [
            [Types.string, Types.arrayOf(Types.bool)],
            [Types.string, Types.arrayOf(Types.Date)],
            [Types.string, Types.arrayOf(Types.number)],
            [Types.string, Types.arrayOf(Types.string)],
            [Types.string, Types.arrayOf(Types.string), Types.Case]
        ]
    },
    'isEmpty': {
        signatures: [
            [Types.string]
        ]
    },
    'isNotEmpty': {
        signatures: [
            [Types.string]
        ]
    },
    'isNotNull': {
        signatures: [
            [Types.string]
        ]
    },
    'isNull': {
        signatures: [
            [Types.string]
        ]
    },
    'lessThan': {
        signatures: [
            [Types.string, Types.Date],
            [Types.string, Types.number]
        ]
    },
    'lessThanOrEqualTo': {
        signatures: [
            [Types.string, Types.Date],
            [Types.string, Types.number]
        ]
    },
    'not': { signatures: [[]] },
    'notEqualTo': {
        signatures: [
            [Types.string, Types.bool],
            [Types.string, Types.number],
            [Types.string, Types.string],
            [Types.string, Types.string, Types.Case]
        ]
    },
    'or': { signatures: [[]] }
};

Object.keys(queryMethods).forEach(function(method) {
    QueryBuilder.prototype[method] = function() {
        appendOperation(this.ops, method, arguments, queryMethods[method]);
        return this;
    };
});

function onExecuteSuccess(success) {
    return function(realmResultsId, results) {
        return new RealmResults(realmResultsId, results);
    }
}

// Append execution queries
var executionQueries = {
    'distinct': {
        signatures: [
            [Types.string],
            [Types.string, Types.varArgs(Types.string)],
        ]
    },
    'findAll': { signatures: [[]] },
    'findAllSorted': {
        signatures: [
            [Types.string],
            [Types.arrayOf(Types.string), Types.arrayOf(Types.Sort)],
            [Types.arrayOf(Types.string), Types.Sort],
            [Types.arrayOf(Types.string), Types.Sort, Types.arrayOf(Types.string), Types.Sort]
        ]
    },
    'findFirst': { signatures: [[]] },
};

Object.keys(executionQueries).forEach(function(method) {
    QueryBuilder.prototype[method] = function(success, error) {
        if (!this.valid) {
            // An exception should have been thrown.
            return;
        }
        var args = Array.prototype.slice.call(arguments, 2);
        // TODO Check args only in development mode.
        var signatures = executionQueries[method].signatures;
        var validArgs = checkArgs(args, signatures);
        if (validArgs) {
            exec(onExecuteSuccess(success), error, 'RealmPlugin', method, [
                this.realmObjectID,
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
