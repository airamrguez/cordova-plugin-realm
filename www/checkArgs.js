/**
 * checkArgs returns true when there is a matching signature.
 * @param  {Type} type object with type information.
 * @param  {Array<Argument>} args are the arguments passed into a function.
 * @param  {number} paramIndex index of the argument to be analyzed.
 * @return {boolean} true if there is a signature that matches the types of the
 * operation arguments.
 */
function checkArg(type, args, paramIndex) {
  var param = args[paramIndex];
  var paramType = typeof param;
  if (paramType === 'object') {
    if (type.array) {
      return param.every(function(item) {
        return typeof item === type.typeOf;
      });
    }
    return param instanceof type.instance;
  }
  if (paramType === type.typeOf) {
    if (type.varArgs) {
      var varArgs = args.slice(paramIndex, args.length);
      return varArgs.every(function(varArg) {
        return typeof varArg === type.typeOf;
      });
    }
    if (type.enum) {
      return type.enum[param] !== undefined;
    }
    return true;
  }
  return false;
}

/**
 * checkArgs
 * @param  {Array<Argument>} args are the arguments passed into a function.
 * @param  {Array<Types>} signatures all valid signatures.
 * @return {boolean} true if there is at least one matching signature.
 */
function checkArgs(args, signatures) {
  return signatures.some(function(signature) {
    var isVariadic = signature.some(function(param) {
      return param.varArgs;
    });
    if (!isVariadic && signature.length !== args.length) {
      return false;
    }
    return signature.every(function(type, paramIndex) {
      return checkArg(type, args, paramIndex);
    });
  });
}

module.exports = checkArgs;
