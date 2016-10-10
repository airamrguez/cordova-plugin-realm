
var Case = {};
(function (Case) {
    Case[Case['SENSITIVE'] = 0] = 'SENSITIVE';
    Case[Case['INSENSITIVE'] = 1] = 'INSENSITIVE';
})(Case);

var Sort = {};
(function (Sort) {
    Sort[Sort['SENSITIVE'] = 0] = 'SENSITIVE';
    Sort[Sort['INSENSITIVE'] = 1] = 'INSENSITIVE';
})(Sort);

var types = {
    bool: { typeOf: 'boolean' }, 
    string: { typeOf: 'string' },
    number: { typeOf: 'number' },
    Case: {
        typeOf: 'number',
        enum: Case
    },
    Sort: {
        typeOf: 'number',
        enum: Sort
    },
    Date: {
        typeOf: 'object',
        instance: Date
    },
    arrayOf: function(type) {
        return {
            typeOf: type.typeOf,
            array: true,
        };
    },
    varArgs: function(type) {
        return {
            typeOf: type.typeOf,
            varArgs: true
        };
    }
};

module.exports = types;
