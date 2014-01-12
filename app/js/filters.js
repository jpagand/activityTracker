'use strict';

/* Filters */

angular.module('tracker.filters', []).
  filter('interpolate', ['version', function(version) {
    return function(text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    }
  }])
  .filter('timer', function() {
    return function(time) {
      var out = '';
      var sec =  Math.floor((time % 60)) + 's';
      out = sec;
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
