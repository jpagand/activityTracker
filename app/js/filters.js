'use strict';

/* Filters */

angular.module('tracker.filters', []).
  filter('interpolate', ['version', function(version) {
    return function(text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    }
  }]).
  filter('timeFrame', ['$filter', function($filter) {
    return function(timeFilterFrom, timeFilterFrame) {
      var date = new Date(timeFilterFrom * 1000);
      if (timeFilterFrame === 'day') {
        return $filter('date')(date, 'mediumDate');
      } else if (timeFilterFrame === 'week') {
        var nextWeek = new Date((timeFilterFrom + (3600 * 24 * 7) - 1) * 1000);
        return $filter('date')(date, 'mediumDate') + ' - ' + $filter('date')(nextWeek, 'mediumDate');
      }else if (timeFilterFrame === 'month') {
        return $filter('date')(date, 'MMMM yyyy');
      }else if (timeFilterFrame === 'year') {
        return $filter('date')(date, 'yyyy');
      }
      return 'All';
    }
  }])
  .filter('timer', function() {
    return function(time) {
      if (!_.isFinite(time)) {
        return '';
      }
      var sec =  Math.floor((time % 60)) + 's';
      var out = sec;
      var min = Math.floor(time / 60);
      if (min > 0) {
        out = (min % 60) + 'm ' + out;
        var hour = Math.floor(min / 60);
        if (hour > 0) {
          out = (hour % 24) + 'h ' + out;
          var day = Math.floor(hour / 24);
          if (day > 0) {
            out = day + 'd ' + out;
          }
        }
      }
     return out;
    }
  });
