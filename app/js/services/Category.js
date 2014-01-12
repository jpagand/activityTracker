'use strict';
 var STREAMS = [{ "name": "Sport", "id": "sport", "parentId": null, "clientData": {"activity-tracker:color" : "red"},
   "children": [
     { "name": "Jogging", "id": "jogging", "parentId": "sport", "children": [] },
     { "name": "Bicycling", "id": "bicycling", "parentId": "sport", "children": [] }
   ]},
   { "name": "Work", "id": "work", "parentId": null, singleActivity: true, "clientData": {"activity-tracker:color" : "green"},
     "children": [
       { "name": "Noble Works Co.", "id": "noble-works","parentId": "work"},
       { "name": "Freelancing", "id": "freelancing","parentId": "work"}
     ]
   }];
var EVENTS = [{"id": "test", time: 1333754621, duration: null, streamId: "freelancing"}];
var ONLINE = false;
/*
 * Categories et activities ca va pas
 * faire stream et event
 */
angular.module('tracker.category', [])
.factory('Category', ['$rootScope', function($rootScope) {
  var CAT_KEYS = ['name', 'color', 'singleActivity'];
  var ACT_KEYS = ['name', 'size', 'time', 'duration'];
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
  return {
    categories: null,
    activities: null,
    online: ONLINE,
    init: function () {
      if (this.categories && this.activities) {
        return;
      }
      this.categories = {};
      this.activities = {};
      this.getStreams().forEach(function (stream) {
        stream.collapsed = true;
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
        }.bind(this))
      }.bind(this));
      this.getEvents().forEach(function (event) {
        if (!this.activities[event.streamId]) {
          this.activities[event.streamId] = {};
        }
          if (_.has(event, 'duration')) {
            if (!event.duration) {
              this.activities[event.streamId].runningEvent = event;
            }
            this.activities[event.streamId].events[event.id || event.tempId]  = event;
          }
      }.bind(this))
    },
    getStreams: function () {
      if (localStorage) {
        return JSON.parse(localStorage.getItem('activityTracker:streams'))|| [];
      }
      return STREAMS;
    },
    getEvents: function (params) {
      if (localStorage) {
        return JSON.parse(localStorage.getItem('activityTracker:events')) || [];
      }
      return EVENTS;
    },
    getRunningTime: function (activity) {
      var time = 0, now = new Date().getTime() / 1000;
      _.each(activity.events, function (event) {
        if (!event.duration) {
          time += now - event.time;
        } else {
          time += event.duration;
        }
      });
      return time;
    },
    start: function (activity, time) {
      time = time || new Date().getTime() / 1000;
      var activityId = activity.activity.id || activity.activity.tempId;
      var event = {type: 'activity/pryv', time: time, streamId: activityId, duration: null, tempId: 'newEvent_'  + new Date().getTime()};
      this.activities[activityId].events[event.tempId] = event;
      if (this.online) {
        //this.synchData();
      }  else {
        this.offlineStop(activityId, time);
        this.activities[activityId].runningEvent = event;
        this.synchData();
        $rootScope.$broadcast('categories.update');
      }
    },
    stop: function (activity, time) {
      time = time || new Date().getTime() / 1000;
      var activityId = activity.activity.id || activity.activity.tempId;
      var event = this.activities[activityId].runningEvent;
      event.duration = time - event.time;
      var id = event.id || event.tempId;
      this.activities[activityId].events[id] = event;
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
      newCat.children = [];
      //newCat.newActCollapsed = true;
      newCat.tempId = 'newCat_' + new Date().getTime();
      this.categories[newCat.tempId] = newCat;
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
      newAct.tempId ='newAct_' + new Date().getTime();
      category.children.push(newAct);
      this.activities[newAct.tempId] = {};
      this.activities[newAct.tempId].activity = newAct;
      this.activities[newAct.tempId].events = {};
      this.activities[newAct.tempId].runningEvent = null;
      this.synchData();
      $rootScope.$broadcast('categories.update');
    },
    synchData: function () {
      if (localStorage) {
        localStorage.setItem('activityTracker:streams', JSON.stringify(_.toArray(this.categories)));
        var events = [];
        _.each(this.activities, function (activity) {
          events = events.concat(_.toArray(activity.events));
        })
        localStorage.setItem('activityTracker:events', JSON.stringify(_.toArray(events)));
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