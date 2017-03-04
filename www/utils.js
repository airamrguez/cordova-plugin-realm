var utils = {
  findSchema: function(schemas, schemaName) {
    return schemas.find(function(schema) {
      return schema.name === schemaName;
    });
  },
  getInnerSchemas: function(schema, schemas, objectProperties) {
    return objectProperties.map(function(prop) {
      return utils.findSchema(schemas, schema.properties[prop].objectType);
    });
  },
  getPropsOfType: function(schema, type) {
    var properties = schema.properties;
    return Object.keys(properties).filter(function(key) {
      return properties[key].type === type;
    });
  },
  normalizeSchema: function(results, schemas, schema) {
    var dateProperties = utils.getPropsOfType(schema, 'date');
    dateProperties.forEach(function(prop) {
      results.forEach(function(result) {
        result[prop] = new Date(result[prop]);
      });
    });
    var objProps = utils.getPropsOfType(schema, 'object');
    var objInnerSchemas = utils.getInnerSchemas(schema, schemas, objProps);
    objInnerSchemas.forEach(function(innerSchema, i) {
      results.forEach(function(result) {
        utils.normalizeSchema([result[objProps[i]]], schemas, innerSchema);
      });
    });
    var listProps = utils.getPropsOfType(schema, 'list');
    var listInnerSchemas = utils.getInnerSchemas(schema, schemas, listProps);
    listInnerSchemas.forEach(function(innerSchema, i) {
      results.forEach(function(result) {
        utils.normalizeSchema(result[listProps[i]], schemas, innerSchema);
      });
    });
    return results;
  }
};

module.exports = utils;
