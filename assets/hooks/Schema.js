'use strict';

var Graph = require('./Graph');

function Schema(schemas) {
  this.schemas = schemas;
}

Schema.prototype.createDependencyGraph = function() {
  var schemas = this.schemas;
  var graph = new Graph();
  // Create nodes
  schemas.forEach(function(schema) {
    graph.addNode(schema.name);
  });
  // Create relationships
  schemas.forEach(function(schema) {
    var schemaName = schema.name;
    var head = graph.findNodeById(schemaName);
    if (schema.properties) {
      Object.keys(schema.properties).forEach(function(propertyKey) {
        var property = schema.properties[propertyKey];
        var node;
        if (typeof property === 'object') {
          if (typeof property.objectType === 'string') {
            node = graph.findNodeById(property.objectType);
          } else if (typeof property.type === 'string') {
            node = graph.findNodeById(property.type);
          }
        } else if (typeof property === 'string') {
          node = graph.findNodeById(property);
        }
        if (node) {
          graph.addEdge(head, node);
        }
      });
    }
  });
  return graph;
};

Schema.prototype.sortSchemas = function(dependencyGraph) {
  var schemas = this.schemas;
  schemas.sort(function(modelA, modelB) {
    var aName = modelA.name;
    var bName = modelB.name;
    var aDependencies = dependencyGraph.adjacentsForNode(aName);
    var i;
    var dependency;
    for (i = 0; i < aDependencies.length; i++) {
      dependency = aDependencies[i];
      if (bName === dependency.id) {
        return -1;
      }
    }
    var bDependencies = dependencyGraph.adjacentsForNode(bName);
    for (i = 0; i < bDependencies.length; i++) {
      dependency = bDependencies[i];
      if (aName === dependency.id) {
        return 1;
      }
    }
    return 0;
  });
  return schemas;
};

module.exports = Schema;
