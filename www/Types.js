var Case = {};
(function(Case) {
  Case[Case.INSENSITIVE = 0] = 'INSENSITIVE';
  Case[Case.SENSITIVE = 1] = 'SENSITIVE';
})(Case);

var Sort = {};
(function(Sort) {
  Sort[Sort.DESCENDING = 0] = 'DESCENDING';
  Sort[Sort.ASCENDING = 1] = 'ASCENDING';
})(Sort);

var types = {
  bool: {
    typeOf: 'boolean'
  },
  string: {
    typeOf: 'string'
  },
  number: {
    typeOf: 'number'
  },
  func: {
    typeOf: 'function'
  },
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
      typeOf: type.instance && type.instance().name || type.typeOf,
      array: true
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
