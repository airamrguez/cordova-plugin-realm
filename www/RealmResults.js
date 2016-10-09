var checkArgs = require('./checkArgs');
var Types = require('./Types');

function setProps(result, nextResults) {
    var prevSize = result.length || 0;
    var nextSize = nextResults.length;
    var props = {};
    var i;

    for (i = prevSize; i < nextSize; i++) {
        props[i] = function (index) {
            return {
                get: function() {
                    return nextResults[index];
                },
                set: function(value) {
                    nextResults[index] = value; 
                },
                enumerable: true,
                configurable: true
            }
        }(i);
    }
    for (i = nextSize; i < prevSize; i++) {
        delete result[i];
    }
    for (i = 0; i < prevSize; i++) {
        result[i] = nextResults[i];;
    }

    props['length'] = {
        value: nextResults.length,
        configurable: true
    };

    Object.defineProperties(result, props);
}

function onResultChange(result, nextResults) {
    setProps(result, nextResults);
    result.onChange && result.onChange(result);
}

function RealmResults(realmResultsId, results) {
    Object.defineProperty(this, 'realmResultsId', {
        value: realmResultsId
    });

    setProps(this, results);

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

    var changesChannel = 'results/' + realmResultsId;
    this.changeSubscription = PubSub.subscribe(changesChannel, function(nextResults) {
        onResultChange(this, nextResults);
    });
}

var resultMethods = {
    'sum': { signatures: [[Types.string]] },
    'min': { signatures: [[Types.string]] },
    'max': { signatures: [[Types.string]] },
    'average': { signatures: [[Types.string]] },
    'size': { signatures: [[]] },
};

Object.keys(resultMethods).forEach(function(method) {
    RealmResults.prototype[method] = function() {
        var args = Array.prototype.slice.call(arguments);
        // TODO Check args only in development mode.
        var signatures = resultMethods[method].signatures;
        var validArgs = checkArgs(args, signatures);
        if (validArgs) {
            exec(success, error, 'RealmPlugin', method, [this.realmResultsId, this.ops]);
        } else {
            throw new Error(
                'invalid arguments supplied to method ' + method +
                '. The query will not be executed.'
            );
        }
    };
});

module.exports = RealmResults;
