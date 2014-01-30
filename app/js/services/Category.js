'use strict';
var ONLINE = true;
/*
 * Categories et activities ca va pas
 * faire stream et event
 */
angular.module('tracker.category', [])
  .factory('Category', ['$rootScope', 'Pryv', function($rootScope, Pryv) {
    var CAT_KEYS = ['name', 'color', 'singleActivity'];
    var ACT_KEYS = ['name', 'size', 'time', 'duration'];
    var toSyncCategories = {};
    var toSyncActivities = {};
    var toSyncEvents = {};
    var singleInit = true;

    function isActivityRunning(category) {
      if (!category || !category.children || !Array.isArray(category.children)) {
        return false;
      }
      for (var i = 0; i < category.children.length; i++) {
        for (var j = 0; j < events[category.children[i]].length; j++) {
          if (events[category.children[i]][j].duration) {
            return true;
          }
        }
      }
      return false;
    }
    function canIStart(activity) {
      return !activity.category.singleActivity || isActivityRunning(activity.category);
    }
    function isOverLappinActivity(activity, eventId, time, duration) {
      var result = false;
      var to = time + duration;
      _.each(activity.events, function (event) {
        var id = event.id || event.tempId;
        if (id !== eventId && !result) {
          if (!event.duration && (time > event.time || to > event.time)) {
            console.log('first', arguments, event.duration, time, event.time, to);
            result = true;
          } else if (to > event.time && time < event.time + event.duration) {
            console.log('second', arguments, to, event.time, time, event.time + event.duration);
            result = true;
          }
        }
      })
      return result;
    }
    function isOverLapping(activity, eventId, time, duration) {
      var result = false, self = this;
      console.log(self);
      var activityId = activity.activity.id || activity.activity.tempId;
      if (isOverLappinActivity(activity, eventId, time, duration)) {
        return true;
      }
      if (activity.category.singleActivity) {
        _.each(activity.category.children, function (child) {
          var actId =  child.id || child.tempId;
          var act = self.activities[actId];
          if (actId !== activityId && !result) {
            result = isOverLappinActivity(act, eventId, time, duration);
          }
        }.bind(this))
      }
      return result;
    }
    return {
      categories: null,
      activities: null,
      online: ONLINE,
      init: function (callback) {
        if (this.categories && this.activities && !singleInit) {
          if (angular.isFunction(callback)) {
            callback();
          }
          return;
        }
        singleInit = false;
        if (localStorage) {
          toSyncActivities = JSON.parse(localStorage.getItem('toSyncActivities')) || {};
          toSyncCategories = JSON.parse(localStorage.getItem('toSyncCategories')) || {};
          toSyncEvents = JSON.parse(localStorage.getItem('toSyncEvents')) || {};
          this.categories = {};
          this.activities = {};
          this.synchData(function () {
            this.initData();
            if (angular.isFunction(callback)) {
              callback();
            }
          }.bind(this));
        }

      },
      initData: function () {
        this.categories = {};
        this.activities = {};
        this.getStreams(function (streams) {
          console.log(streams);
          streams.forEach(function (stream) {
            if (stream.trashed) {
              return;
            }
            stream.collapsed = true;
            if (stream.clientData && stream.clientData['activity-tracker:color']) {
              stream.color = stream.clientData['activity-tracker:color'];
            }
            this.categories[stream.id || stream.tempId] = stream;
            stream.children.forEach(function (child) {
              var childId = child.id || child.tempId;
              this.activities[childId] = {};
              if (stream.clientData && stream.clientData['activity-tracker:color']) {
                child.color = stream.clientData['activity-tracker:color'];
              }
              this.activities[childId].activity = child;
              this.activities[childId].runningEvent = null;
              this.activities[childId].events = {};
              this.activities[childId].category = stream;
            }.bind(this));
          }.bind(this));
          $rootScope.$broadcast('categories.update');
        }.bind(this))
        this.getEvents(function (events) {
          events.forEach(function (event) {
            if (event.type !== 'activity/pryv' || event.trashed) {
              return;
            }
            if (!this.activities[event.streamId]) {
              this.activities[event.streamId] = {};
            }
            if (_.has(event, 'duration')) {
              if (!event.duration) {
                this.activities[event.streamId].runningEvent = event;
              }
              this.activities[event.streamId].events[event.id || event.tempId]  = event;
            }
          }.bind(this));
          $rootScope.$broadcast('categories.update');
        }.bind(this));
      },
      getStreams: function (callback) {
        var streams;
        if (ONLINE) {
          Pryv.getStreams(null, callback);
        } else {
          if (localStorage) {
            streams = JSON.parse(localStorage.getItem('activityTracker:streams')) || [];
            if (angular.isFunction(callback)) {
              callback(streams);
            }
          }
        }
      },
      getEvents: function (callback) {
        var events;
        if (ONLINE) {
          Pryv.getEvents(null, callback);
        } else {
          if (localStorage) {
            events = JSON.parse(localStorage.getItem('activityTracker:events')) || [];
            if (angular.isFunction(callback)) {
              callback(events);
            }
          }
        }
      },
      getRunningTime: function (activity, fromTime, toTime) {
        var time = 0, eventFrom = 0, eventTo = 0, now = new Date().getTime() / 1000;
        toTime = toTime === 0 ? now : toTime;
        fromTime = fromTime || 0;
        _.each(activity.events, function (event) {
          if (event.trashed) {
            return;
          }
          eventFrom = event.time;
          eventTo = event.duration ? eventFrom + event.duration : now;
          if ((eventFrom < fromTime && eventTo < fromTime) || (eventFrom > toTime && eventTo > toTime)) {
            return;
          }
          if (eventFrom < fromTime && eventTo < toTime) {
            time += eventTo - fromTime;
          }
          if (eventFrom < fromTime && eventTo > toTime) {
            time += toTime - fromTime;
          }
          if (eventFrom > fromTime && eventTo < toTime) {
            time += eventTo - eventFrom;
          }
          if (eventFrom > fromTime && eventTo > toTime) {
            time += toTime - eventFrom;
          }
        });
        return time;
      },
      isOverLapping: isOverLapping,
      createEvent: function (activity, time, duration) {
        var activityId = activity.activity.id || activity.activity.tempId;
        var event = {type: 'activity/pryv', time: time, streamId: activityId, duration: duration, tempId: 'newEvent_'  + new Date().getTime(), modified: new Date().getTime() / 1000};
        this.activities[activityId].events[event.tempId] = event;
        toSyncEvents[event.tempId] = event;
        this.synchData();
        $rootScope.$broadcast('categories.update');
        return event;
      },
      updateEvent: function (activity, eventId, changes) {
        var activityId = activity.activity.id || activity.activity.tempId;
        var event = _.extend(this.activities[activityId].events[eventId], changes);
        this.activities[activityId].events[eventId].modified = new Date().getTime() / 1000;
        toSyncEvents[eventId] = event;
        this.synchData();
        $rootScope.$broadcast('categories.update');
        return event;
      },
      deleteEvent: function (activity, eventId) {
        var activityId = activity.activity.id || activity.activity.tempId;
        if (this.activities[activityId].events[eventId].id) {
          this.updateEvent(activity, eventId, {trashed: true});
        } else {
          delete this.activities[activityId].events[eventId];
          this.synchLocal();
          $rootScope.$broadcast('categories.update');
        }
      },
      start: function (activity, time) {
        time = time || new Date().getTime() / 1000;
        var activityId = activity.activity.id || activity.activity.tempId;
        var event = {type: 'activity/pryv', time: time, streamId: activityId, duration: null, tempId: 'newEvent_'  + new Date().getTime(), modified: new Date().getTime() / 1000};
        this.activities[activityId].events[event.tempId] = event;
        toSyncEvents[event.tempId] = event;

          this.offlineStop(activityId, time);
          this.activities[activityId].runningEvent = event;
          this.synchData();
          $rootScope.$broadcast('categories.update');

      },
      stop: function (activity, time) {
        time = time || new Date().getTime() / 1000;
        var activityId = activity.activity.id || activity.activity.tempId;
        var event = this.activities[activityId].runningEvent;
        event.duration = time - event.time;
        event.modified = new Date().getTime() / 1000;
        var id = event.id || event.tempId;
        this.activities[activityId].events[id] = event;
        toSyncEvents[id] = event;
        this.activities[activityId].runningEvent = null;
        this.synchData();
        $rootScope.$broadcast('categories.update');
      },
      offlineStop: function (activityId, time) {
        var parentCat;
        _.each(this.categories, function (category) {
          if (!parentCat) {
            category.children.forEach(function (activity) {
              if (activity.id === activityId || activity.tempId === activityId) {
                parentCat = category;
                return;
              }
            });
          }
        });
        if (!parentCat.singleActivity) {
          var activity = this.activities[activityId];
          var runningEvent = activity.runningEvent;
          if (runningEvent) {
            var id = runningEvent.id || runningEvent.tempId;
            activity.events[id].duration = time - activity.events[id].time;
            toSyncEvents[id] = activity.events[id];
            activity.runningEvent = null;
          }
          return;
        } else {
          parentCat.children.forEach(function (child) {
            var activity = this.activities[child.id || child.tempId];
            var runningEvent = activity.runningEvent;
            if (runningEvent) {
              var id = runningEvent.id || runningEvent.tempId;
              activity.events[id].duration = time - activity.events[id].time;
              toSyncEvents[id] = activity.events[id];
              activity.runningEvent = null;
            }
          }.bind(this))
        }
      },
      addCategory: function (category) {
        if (!category || !category.name) {
          return;
        }
        var newCat = {};
        for (var key in category) {
          if (CAT_KEYS.indexOf(key) !== -1) {
            newCat[key] = category[key];
          }
        }
        if (newCat.color) {
          newCat.clientData = {};
          newCat.clientData['activity-tracker:color'] = newCat.color;
        }
        newCat.collapsed = true;
        newCat.modified = new Date().getTime() / 1000;
        newCat.children = [];
        newCat.parentId = 'activity-tracker';
        newCat.id = 'newCat-' + new Date().getTime();
        toSyncCategories[newCat.id] = newCat;
        this.categories[newCat.id] = newCat;
        this.synchData();
        $rootScope.$broadcast('categories.update');
      },
      addActivity: function(category, activity) {
        if (!category || !category.name || !activity || !activity.name) {
          return;
        }
        var newAct = {};
        for (var key in activity) {
          if (ACT_KEYS.indexOf(key) !== -1) {
            newAct[key] = activity[key];
          }
        }if (category.clientData && category.clientData['activity-tracker:color']) {
          newAct.color = category.clientData['activity-tracker:color'];
        }
        //newAct.category = category;
        newAct.id ='newAct-' + new Date().getTime();
        newAct.modified = new Date().getTime() / 1000;
        newAct.parentId = category.id || category.tempId;
        toSyncActivities[newAct.id] = newAct;
        category.children.push(newAct);
        this.activities[newAct.id] = {};
        this.activities[newAct.id].activity = newAct;
        this.activities[newAct.id].events = {};
        this.activities[newAct.id].category = category;
        this.activities[newAct.id].runningEvent = null;
        this.synchData();
        $rootScope.$broadcast('categories.update');
      },
      synchLocal: function () {
        if (localStorage) {
          localStorage.setItem('activityTracker:streams', JSON.stringify(_.toArray(this.categories)));
          var events = [];
          _.each(this.activities, function (activity) {
            events = events.concat(_.toArray(activity.events));
          })
          localStorage.setItem('activityTracker:events', JSON.stringify(_.toArray(events)));
        }
      },
      synchData: function (callback) {
        if (this.categories && this.activities) {
          this.synchLocal();
        }
        if (this.online) {
          //todo copy toSync, for each to api request
          // event create/update id defined by event.id
          // category (first) and activity defined by e.created
          // put id and created when done
          var categories = angular.copy(toSyncCategories),
            activities = angular.copy(toSyncActivities),
            events = angular.copy(toSyncEvents),
            catRqNb = 0,
            actRqNb = 0,
            evRqNb = 0,
            self = this;
          var syncEv = function () {
            if (_.size(events) === 0) {
              if (angular.isFunction(callback)){
                callback();
              }
            } else {
            angular.forEach(events, function (value, key) {
              evRqNb++;
              if (!value.id) {
                Pryv.createEvent(value, function (result) {
                  evRqNb--;
                  self.activities[value.streamId].events[key].id = result.id;
                  delete toSyncEvents[key];
                  if (actRqNb === 0) {
                    if (angular.isFunction(callback)){
                      callback();
                    }
                  }
                })
              } else {
                Pryv.updateEvent(value, function () {
                  evRqNb--;
                  delete toSyncEvents[key];
                  if (actRqNb === 0) {
                    if (angular.isFunction(callback)){
                      callback();
                    }
                  }
                })
              }
            });
            }
          }
          var syncAct = function () {
            if (_.size(activities) === 0) {
              syncEv();
            } else {
              angular.forEach(activities, function (value, key) {
                actRqNb++;
                if (!value.created) {
                  Pryv.createStream(value, function () {
                    actRqNb--;
                    self.activities[key].activity.created = new Date().getTime() / 1000;
                    delete toSyncActivities[key];
                    if (actRqNb === 0) {
                      syncEv();
                    }
                  })
                } else {
                  Pryv.updateStream(value, function () {
                    actRqNb--;
                    delete toSyncActivities[key];
                    if (actRqNb === 0) {
                      syncEv();
                    }
                  })
                }
              });
            }
          }
          if (_.size(categories) === 0) {
            syncAct();
          } else {
            angular.forEach(categories, function (value, key) {
              catRqNb++;
              if (!value.created) {
                Pryv.createStream(value, function () {
                  catRqNb--;
                  self.categories[key].created = new Date().getTime() / 1000;
                  delete toSyncCategories[key];
                  if (catRqNb === 0) {
                    syncAct();
                  }
                })
              } else {
                Pryv.updateStream(value, function () {
                  catRqNb--;
                  delete toSyncCategories[key];
                  if (catRqNb === 0) {
                    syncAct();
                  }
                })
              }
            });
          }
        } else {
          if (angular.isFunction(callback)) {
            callback();
          }
        }
      },
      _getActivities: function(category) {
        if (!category) {
          var result = [];
          _.each(this.categories, function (cat) {
            result = result.concat(this._getActivities(cat));
          }.bind(this));
          return result;
        } else {
          return category.children;
        }
      }
    };
  }]);