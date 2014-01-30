'use strict';

/* Controllers */
var TIME_FILTER_FROM = 0;
var TIME_FILTER_TO = 0;
var TIME_FILTER_FRAME = 'all';
var PANEL_OPENEND = false;
angular.module('tracker.controllers', []).
  controller('Masonry', ['$scope', '$interval', 'Category', '$modal', function($scope, $interval, Category, $modal) {
    function getAllActivities() {
      var result = [];
      _.each(Category.activities, function (activity) {
        result.push(activity);
      })
      return result;
    }
    function tick() {
      $scope.activities.forEach(function (activity) {
        var id = activity.activity.id || activity.activity.tempId;
        $scope.timers[id] = Category.getRunningTime(activity, TIME_FILTER_FROM, TIME_FILTER_TO);
      })
    }
    $scope.openModal = function (activity) {
      var modalInstance = $modal.open({
        templateUrl: './partials/configActivity.html',
        controller: 'ConfigActivity',
        resolve: {
          activity: function () {
            return activity;
          }
        }
      });
    }
    $scope.$on('categories.update', function () {
      $scope.categories = _.toArray(Category.categories);
      $scope.activities = getAllActivities();
    });
    $scope.start = function (activity) {
      Category.start(activity);
    }
    $scope.stop = function (activity) {
      Category.stop(activity);
    }
    $scope.categories = _.toArray(Category.categories);
    $scope.activities = getAllActivities();
    $scope.timers = {};
    $interval(tick, 1000);
    $scope.$on('filter.timeChange', function () {
      tick();
    });
  }])
  .controller('Panel', ['$scope', '$timeout', 'Category', 'Pryv', function ($scope, $timeout, Category, Pryv) {
    $scope.username = 'Sign in';
    $scope.$on('categories.update', function () {
      $scope.categories = _.toArray(Category.categories);
    });
    $scope.newCatCollapsed = true;
    $scope.categories = _.toArray(Category.categories);
    $scope.addCategory = function (newCategory) {
      Category.addCategory(newCategory);
    }
    $scope.addActivity = function (category, newActivity) {
      Category.addActivity(category, newActivity);
    }
    $scope.login = function () {
      if ($scope.username === 'Sign in') {
        Pryv.login(function (result) {
          $scope.username = result.username;
        }, console.log)
      } else {
        Pryv.logout();
        $scope.username = 'Sign in';
      }
    };
    $timeout(function (){
      var credential = Pryv.getCredential();
      $scope.username = credential.username || 'Sign in';
      Category.init();
    })
  }])
  .controller('Calendar', ['$scope', 'Category', '$filter', '$rootScope', '$timeout', function ($scope, Category, $filter, $rootScope, $timeout) {
    $scope.activities = Category.activities;
    function setView() {
      $scope.myCalendar.fullCalendar('today');
      if (TIME_FILTER_FRAME === 'day') {
        $scope.myCalendar.fullCalendar('changeView', 'agendaDay');
      } else if (TIME_FILTER_FRAME === 'week') {
        $scope.myCalendar.fullCalendar('changeView', 'agendaWeek');
      } else {
        $scope.myCalendar.fullCalendar('changeView', 'month');
      }
    }
    function prev() {
      $scope.myCalendar.fullCalendar('prev');
    }
    function next() {
      $scope.myCalendar.fullCalendar('next');
    }
    $scope.$on('filter.timeFrameChange', setView);
    $scope.$on('filter.timeNext', next);
    $scope.$on('filter.timePrevious', prev);
    $scope.calendarOptions = {
      height: $(document).height() - 150,
      allDaySlot: false,
      editable: true,
      snapMinutes: 10,
      header: false,
      revertDuration: 100,
      droppable: true,
      dropAccept: '.drop-activity',
      drop: function () {
        var time = arguments[0].getTime() / 1000, duration = 3600, activity = Category.activities[$(this).attr('data-id')];
        var event = Category.createEvent(activity, time, duration);
        var o = {events: [], color: activity.activity.color};
        var startDate = new Date(event.time * 1000);
        var stopDate  = event.duration ? new Date((event.time + event.duration) * 1000) : new Date();
        var e = {activity: activity, event: event, title: activity.activity.name, start: $filter('date')(startDate, 'yyyy-MM-dd HH:mm:ss'), end: $filter('date')(stopDate, 'yyyy-MM-dd HH:mm:ss'), allDay: false}
        o.events.push(e);
        $scope.eventSources.push(o);
        $scope.$apply();
      },
      eventRender: function (e, $e) {
        $($e).append('<span class="delete glyphicon glyphicon-trash"></span>');
        $( $e).on('click', '.delete', function () {
          Category.deleteEvent(e.activity, e.event.id || e.event.tempId);
          $scope.myCalendar.fullCalendar('removeEvents', e._id);
          initData();
          $scope.$apply();
        })
      },
      eventDrop: function (e, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view ) {
        var eventId = e.event.id || e.event.tempId;
        var time = e.event.time + (dayDelta  * 3600 * 24) + (minuteDelta * 60);
        if (Category.isOverLapping(e.activity, eventId, time, e.event.duration)) {
          revertFunc();
        } else {
          Category.updateEvent(e.activity, eventId, {time: time});
        }
      },
      eventResize: function( e, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view ) {
        var eventId = e.event.id || e.event.tempId;
        var duration = e.event.duration + (dayDelta  * 3600 * 24) + (minuteDelta * 60);
        if (Category.isOverLapping(e.activity, eventId, e.event.time, duration)) {
          revertFunc();
        } else {
          Category.updateEvent(e.activity, eventId, {duration: duration});
        }
      }
    }
    $scope.eventSources = [
    ]
    function initData() {
      $scope.eventSources = [];
      _.each(Category.activities, function (activity) {
        var o = {events: [], color: activity.activity.color}
        _.each(activity.events, function (event) {
          if (event.trashed) {
            return;
          }
          var startDate = new Date(event.time * 1000);
          var stopDate  = event.duration ? new Date((event.time + event.duration) * 1000) : new Date();
          var e = {activity: activity, event: event, title: activity.activity.name, start: $filter('date')(startDate, 'yyyy-MM-dd HH:mm:ss'), end: $filter('date')(stopDate, 'yyyy-MM-dd HH:mm:ss'), allDay: false}
          o.events.push(e);
        })
        $scope.eventSources.push(o);
      });
    }

    initData();
    $timeout(function (){
      Category.init(function () {
        initData();
        setView();
        console.log($('.drop-activity'));
        $('.drop-activity').draggable({
          zIndex: 999,
          revert: true,      // will cause the event to go back to its
          revertDuration: 0
        })
        $scope.$apply();
      });
    },1000, false);
  }])
  .controller('ConfigActivity', ['$scope', 'activity', function ($scope, activity) {
    $scope.activity = activity;
  }])
  .controller('Header', ['$scope', '$rootScope', function($scope, $rootScope) {
    $scope.timeFilterFrom = TIME_FILTER_FROM;
    $scope.timeFilterTo = TIME_FILTER_TO;
    $scope.timeFilterFrame = TIME_FILTER_FRAME;
    $scope.togglePanel = function () {
      PANEL_OPENEND = !PANEL_OPENEND;
    }
    $scope.setTimeFilter = function (timeFrame) {
      if (!PANEL_OPENEND) {
      TIME_FILTER_FRAME = timeFrame;
      var date = new Date(), y = date.getFullYear(), m = date.getMonth(), dm = date.getDate(), dw = date.getDay();
      if (timeFrame === 'day') {
        TIME_FILTER_FROM = new Date(y, m, dm).getTime() / 1000;
        TIME_FILTER_TO = TIME_FILTER_FROM + (3600 * 24);
      } else if (timeFrame === 'week') {
        TIME_FILTER_FROM = new Date(y, m, dm).getTime() / 1000;
        dw -= 0; // Start from sunday || 1 for monday
        TIME_FILTER_FROM -= (((dw % 7) + 7) % 7) * 3600 * 24;
        TIME_FILTER_TO = TIME_FILTER_FROM + (3600 * 24 * 7);
      } else if (timeFrame === 'month') {
        TIME_FILTER_FROM = new Date(y, m, 1).getTime() / 1000;
        TIME_FILTER_TO = new Date(y, m + 1, 1).getTime() / 1000;
      } else if (timeFrame === 'year') {
        TIME_FILTER_FROM = new Date(y, 0, 1).getTime() / 1000;
        TIME_FILTER_TO = new Date(y + 1, 0, 1).getTime() / 1000;
      } else {
        TIME_FILTER_FROM = 0;
        TIME_FILTER_TO = 0;
      }
      $scope.timeFilterFrom = TIME_FILTER_FROM;
      $scope.timeFilterTo = TIME_FILTER_TO;
      $scope.timeFilterFrame = TIME_FILTER_FRAME;
      $rootScope.$broadcast('filter.timeChange');
      $rootScope.$broadcast('filter.timeFrameChange');
      }
    };
    $scope.next = function  () {
      if (!PANEL_OPENEND) {
      var currDateFrom =  new Date(TIME_FILTER_FROM * 1000);
      var currDateTo =  new Date(TIME_FILTER_TO * 1000);
      if (TIME_FILTER_FRAME === 'day') {
        TIME_FILTER_FROM += 3600 * 24;
        TIME_FILTER_TO = TIME_FILTER_FROM + (3600 * 24);
      } else if (TIME_FILTER_FRAME === 'week') {
        TIME_FILTER_FROM += 3600 * 24 * 7;
        TIME_FILTER_TO = TIME_FILTER_FROM + (3600 * 24 * 7);
      } else if (TIME_FILTER_FRAME === 'month') {
        TIME_FILTER_FROM = currDateFrom.setMonth(currDateFrom.getMonth() + 1) / 1000;
        TIME_FILTER_TO = currDateTo.setMonth(currDateTo.getMonth() + 1) / 1000;
      } else if (TIME_FILTER_FRAME === 'year') {
        TIME_FILTER_FROM = currDateFrom.setYear(1900 + currDateFrom.getYear() + 1) / 1000;
        TIME_FILTER_TO = currDateTo.setYear(1900 + currDateTo.getYear() + 1) / 1000;
      }
      $scope.timeFilterFrom = TIME_FILTER_FROM;
      $scope.timeFilterTo = TIME_FILTER_TO;
      $scope.timeFilterFrame = TIME_FILTER_FRAME;
      $rootScope.$broadcast('filter.timeChange');
      $rootScope.$broadcast('filter.timeNext');
      }
    };
    $scope.previous = function  () {
      if (!PANEL_OPENEND) {
      var currDateFrom =  new Date(TIME_FILTER_FROM * 1000);
      var currDateTo =  new Date(TIME_FILTER_TO * 1000);
      if (TIME_FILTER_FRAME === 'day') {
        TIME_FILTER_FROM -= 3600 * 24;
        TIME_FILTER_TO = TIME_FILTER_FROM + (3600 * 24);
      } else if (TIME_FILTER_FRAME === 'week') {
        TIME_FILTER_FROM -= 3600 * 24 * 7;
        TIME_FILTER_TO = TIME_FILTER_FROM + (3600 * 24 * 7);
      } else if (TIME_FILTER_FRAME === 'month') {
        TIME_FILTER_FROM = currDateFrom.setMonth(currDateFrom.getMonth() - 1) / 1000;
        TIME_FILTER_TO = currDateTo.setMonth(currDateTo.getMonth() - 1) / 1000;
      } else if (TIME_FILTER_FRAME === 'year') {
        TIME_FILTER_FROM = currDateFrom.setYear(1900 + currDateFrom.getYear() - 1) / 1000;
        TIME_FILTER_TO = currDateTo.setYear(1900 + currDateTo.getYear() - 1) / 1000;
      }
      $scope.timeFilterFrom = TIME_FILTER_FROM;
      $scope.timeFilterTo = TIME_FILTER_TO;
      $scope.timeFilterFrame = TIME_FILTER_FRAME;
      $rootScope.$broadcast('filter.timeChange');
      $rootScope.$broadcast('filter.timePrevious');
      }
    };
    $scope.setTimeFilter('day');
  }]);