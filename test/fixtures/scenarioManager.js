var path = require('path');
var elasticsearch = require('elasticsearch');
var Promise = require('bluebird');
var config = require('./config').scenarios;

function ScenarioManager(server) {
  if (!server) throw new Error('No server defined');

  this.client = new elasticsearch.Client({
    host: server
  });
}

/**
* Load a testing scenario
* @param {string} id The scenario id to load
* @return {Promise} A promise that is resolved when elasticsearch has a response
*/
ScenarioManager.prototype.load = function (id) {
  var self = this;
  var scenario = config[id];
  if (!scenario) return Promise.reject('No scenario found for ' + id);

  return Promise.all(scenario.bulk.map(function mapBulk(bulk) {
    var loadIndexDefinition;
    if (bulk.indexDefinition) {
      var body = require(path.join(scenario.baseDir, bulk.indexDefinition));
      loadIndexDefinition = self.client.indices.create({
        index: bulk.indexName,
        body: body
      });
    } else {
      loadIndexDefinition = Promise.resolve();
    }

    return loadIndexDefinition
    .then(function bulkRequest() {
      var body = require(path.join(scenario.baseDir, bulk.source));
      return self.client.bulk({
        body: body
      });
    })
    .catch(function (err) {
      if (bulk.haltOnFailure === false) return;
      throw err;
    });
  }));
};

/**
* Delete a scenario
* @param {string} index
* @return {Promise} A promise that is resolved when elasticsearch has a response
*/
ScenarioManager.prototype.unload = function (id) {
  var scenario = config[id];
  if (!scenario) return Promise.reject('No scenario found for ' + id);

  var indices = scenario.bulk.map(function mapBulk(bulk) {
    return bulk.indexName;
  });

  return this.client.indices.delete({
    index: indices
  });
};

/**
* Reload a scenario
* @param {string} index
* @return {Promise} A promise that is resolved when elasticsearch has a response
*/
ScenarioManager.prototype.reload = function (id) {
  var self = this;

  return self.unload(id)
  .then(function load() {
    return self.load(id);
  });
};

/**
* Sends a delete all indices request
* @return {Promise} A promise that is resolved when elasticsearch has a response
*/
ScenarioManager.prototype.deleteAll = function () {
  return this.client.indices.delete({
    index: '*'
  });
};

/**
 * Load a testing scenario if not already loaded
 * @param {string} id The scenario id to load
 * @return {Promise} A promise that is resolved when elasticsearch has a response
 */
ScenarioManager.prototype.loadIfEmpty = function (id) {
  var self = this;
  var scenario = config[id];
  if (!scenario) throw new Error('No scenario found for ' + id);

  var self = this;
  return Promise.all(scenario.bulk.map(function mapBulk(bulk) {
    var loadIndexDefinition;

    return self.client.count({
      index: bulk.indexName
    })
    .then(function handleCountResponse(response) {
      if (response.count === 0) {
        return self.load(id);
      }
    });
  }))
  .catch(function (reason) {
    return self.load(id);
  });
};

module.exports = ScenarioManager;