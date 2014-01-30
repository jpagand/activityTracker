'use strict';

/* Directives */


angular.module('tracker.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }])
  .directive('addCategory', ['Category', function (Category) {
    var ENTER_KEY = 13;
    return function (scope, elem, attrs) {
      console.log(arguments);
      elem.bind('keydown', function (event) {
        if (event.keyCode === ENTER_KEY) {
          console.log(scope.title);
        }
      });
    };
  }])
  .directive('categoryEnter', ['Category', function (Category) {
    var ENTER_KEY = 13;
    return function (scope, elem, attrs) {
      console.log(arguments);
      elem.bind('keydown', function (event) {
        if (event.keyCode === ENTER_KEY) {
          console.log(scope.title);
        }
      });
    };
  }]);
