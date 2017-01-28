'use strict';

function Graph() {
  this.nodes = {};
  this.edges = [];
}

function Node(id) {
  this.id = id;
}

function Edge(head, tail) {
  this.head = head;
  this.tail = tail;
}

Graph.prototype.addNode = function(nodeID) {
  var node = new Node(nodeID);
  this.nodes[nodeID] = node;
  return node;
};

Graph.prototype.addEdge = function(head, tail) {
  var edge = new Edge(head, tail);
  this.edges.push(edge);
  return edge;
};

Graph.prototype.adjacentsForNode = function(nodeId) {
  var nodes = [];
  this.edges.forEach(function(edge) {
    if (edge.head.id === nodeId) {
      nodes.push(edge.tail.id);
    }
  });
  return nodes;
};

Graph.prototype.findNodeById = function(id) {
  return this.nodes[id];
};

Graph.prototype.toString = function() {
  return this.edges.map(function(edge) {
    return edge.head.id + ': ' + edge.tail.id;
  }).join('\n');
};

module.exports = Graph;
