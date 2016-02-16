define(function (require) {
  var _ = require('lodash');

  var parser = require('ui/parse_query/lib/query_parser');
  parser.yy = require('ui/parse_query/lib/queryAdapter');

  return function GetQueryFromUser(es, Private) {
    var decorateQuery = Private(require('ui/courier/data_source/_decorate_query'));

    /**
     * Take text from the user and make it into a query object
     *
     * @param {text}
     *          user's query input
     * @returns {object}
     */
    function fromUser(text) {
      text = parser.parse(text).toJson();
      console.log(text);

      function getQueryStringQuery(text) {
        return decorateQuery({
          query_string : {
            query : text
          }
        });
      }

      var matchAll = getQueryStringQuery('*');

      // If we get an empty object, treat it as a *
      if (_.isObject(text)) {
        if (Object.keys(text).length) {
          return text;
        } else {
          return matchAll;
        }
      }

      // Nope, not an object.
      text = (text || '').trim();
      if (text.length === 0) {
        return matchAll;
      }

      if (text[0] === '{') {
        try {
          return JSON.parse(text);
        } catch (e) {
          return getQueryStringQuery(text);
        }
      } else {
        return getQueryStringQuery(text);
      }
    };

    fromUser.setIndexPattern = function (fieldMap) {
      parser.yy.fieldDictionary = fieldMap;
    };

    return fromUser;
  };

});
