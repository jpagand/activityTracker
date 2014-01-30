'use strict';

angular.module('tracker.pryv', [])
  .factory('Pryv', ['$rootScope', '$http', '$timeout', function($rootScope, $http, $timeout) {
    var host = 'pryv.io',
      streamId = "activity-tracker",
      requestingAppId = 'pryv-activity-tracker',
      requestedPermissions = [{"streamId" : streamId,
        "defaultName" : "Activity Tracker",
        "level" : "manage"}],
      defaultConfig = {withCredentials: true},
      Username, Token, ref, stopPoll = false;
    function processCallback(statusWanted, status, result, success, error) {
      if (!angular.isArray(statusWanted)) {
        statusWanted = [statusWanted];
      }
      if (statusWanted.indexOf(status) === -1) {
        console.error('error http', result);
        if (angular.isFunction(error))
          error(result);
      } else {
        if (angular.isFunction(success)) {
          success(result)
        }
      }
    }
    function updateStream(stream, success, error) {
      if (!stream.id) {
        console.error('Put Stream no id found:', stream);
      } else {
        stream = _.pick(stream, 'id', 'name', 'parentId', 'singleActivity', 'clientData', 'trashed');
        post('streams/' + stream.id, stream, success, error);
      }
    }
    function updateEvent (event, success, error) {
      if (!event.id) {
        console.error('Put Event no id found:', event);
      } else {
        var id = event.id;
        event = _.pick(event, 'streamId', 'time', 'duration', 'type', 'content', 'tags', 'references', 'desciption', 'clientData', 'trashed');
        put('events/' + id, event, success, error);
      }
    }
    function put(path, data, success, error) {
      if (!Username || !Token) {
        console.warn('Put',path, 'No credential');
      } else {
        var config = angular.extend({}, data);
        var url = 'https://' + Username + '.' + host + '/' + path + '?auth=' + Token;
        $http.put(url, config).success(function (result, status) {
          processCallback([200, 201], status, result, success, error);
        }).error(function (result, error) {
            processCallback([200, 201], status, result, success, error);
          })
      }
    }
    function createStream (stream, success, error) {
      stream = _.pick(stream, 'id', 'name', 'parentId', 'singleActivity', 'clientData', 'trashed');
      post('streams', stream, success, error);
    }
    function createEvent (event, success, error) {
      event = _.pick(event, 'streamId', 'time', 'duration', 'type', 'content', 'tags', 'references', 'desciption', 'clientData', 'trashed');
      post('events', event, success, error);
    }
    function post(path, data, success, error) {
      if (!Username || !Token) {
        console.warn('Post',path, 'No credential');
      } else {
        var config = angular.extend({}, data);
        var url = 'https://' + Username + '.' + host + '/' + path + '?auth=' + Token;
        $http.post(url, config).success(function (result, status) {
          processCallback(201, status, result, success, error);
        }).error(function (result, error) {
            processCallback(201, status, result, success, error);
          })
      }
    }
    function requestAppId(success, error) {
      var url = 'https://reg.' + host + '/access',
          config = angular.extend({}, defaultConfig, {requestingAppId: requestingAppId, requestedPermissions: requestedPermissions,languageCode: 'en', 'returnURL':false, headers: {'content/type': 'application/json'}});

      $http.post(url, config).success(function (result, status) {
        if (status === 201) {
          console.log(result);
          var popupUrl = result.url;
          if (window.plugins) {
            window.plugins.childBrowser.showWebPage(popupUrl, {showLocationBar: false, showAddress: false, showNavigationBar: false});
            window.plugins.childBrowser.onClose = function () {
              stopPoll = true;
            };
          }  else {
            ref =  window.open(popupUrl, '_blank', 'location=yes, width=305, height=360');
          }
          poll(result.poll, success, error);
        }
      }).error(function (result, status) {
          processCallback(201, status, result, success, error);
        })
    }
    function poll(pollUrl, success, error) {
      if (!stopPoll) {
        var  config = angular.extend({}, defaultConfig);
        $http.get(pollUrl, config).success(function (result, status) {
          console.log(result, ref);
          if (status === 200 || status === 304 || status === 201) {
            if (result.status === 'NEED_SIGNIN') {
              $timeout(function () {
                poll(result.poll, success, error)
              }, result.poll_rate_ms);
            } else if (result.status === 'ACCEPTED') {
              if (window.plugins) {
                window.plugins.childBrowser.close();
              }
              setCredential(result.username, result.token);
              processCallback(200, 200, {username: result.username, token: result.token}, success, error);
            } else {
              if (window.plugins) {
                window.plugins.childBrowser.close();
              }
              processCallback(200, 400, result, success, error);
            }
          }
        });
      }
    }
    function setCredential(username, token) {
      Username = username;
      Token = token;
      if (localStorage) {
        localStorage.setItem('username', username);
        localStorage.setItem('token', token);
      }
    }
    function logout() {
      Username = null;
      Token = null;
      if (localStorage) {
        localStorage.clear();
      }
    }
    function get (path, params, success, error) {
      if (!Username || !Token) {
        console.warn('GET',path, 'No credential');
      } else {
        params = angular.extend({auth: Token}, params);
        var  config = angular.extend({}, {params: params}, defaultConfig),
          url = 'https://' + Username + '.' + host + '/' + path;
      $http.get(url, config)
        .success(function (result, status) {
          processCallback([200, 301], status, result, success, error);
        })
        .error(function (result, status) {
          processCallback([200, 301], status, result, success, error);
        });
      }
    }
    function getStreams (params, success, error) {
      params = angular.extend({parentId: streamId}, params);
      get('streams', params, success, error);
    }
    function getEvents (params, success, error) {
      params = angular.extend({limit: 9999999999}, params);
      get('events', params, success, error);
    }
    function syncStream (doneCallback) {
      if (localStorage) {
        var lastModified = localStorage.getItem('lastStreamModified') || 0;
        var streams = localStorage.getItem('activityTracker:streams');
        var requestNumber = 0;
        streams.forEach(function (stream) {
          if (stream.modified > lastModified) {
            if (stream.created) {
              //requestNumber++;
              //TODO update stream
            } else {
              requestNumber++;
              createStream(stream, function () {
                syncChildren(stream.children, function () {
                  requestNumber--;
                  if (requestNumber === 0 && angular.isFunction(doneCallback)) {
                    doneCallback()
                  }
                });
              })
            }
          }
        })
      }
    }
    function syncChildren (streams, doneCallback) {
      var requestNumber = 0;
      if (streams && streams.length > 0) {
        streams.forEach(function (stream) {
          requestNumber++;
          createStream(stream, function () {
            requestNumber--;
            if (requestNumber ===0 && angular.isFunction(doneCallback)) {
              doneCallback();
            }
          });
        })
      } else {
        if (angular.isFunction(doneCallback)) {
          doneCallback();
        }
      }
    }
    return {
      getCredential: function () {
        if (localStorage) {
          Username = localStorage.getItem('username');
          Token = localStorage.getItem('token');
        }
        return {username: Username, token: Token};
      },
      login: requestAppId,
      logout: logout,
      getStreams: getStreams,
      getEvents: getEvents,
      createEvent: createEvent,
      createStream: createStream,
      updateEvent: updateEvent,
      updateStream: updateStream
    };
  }]);