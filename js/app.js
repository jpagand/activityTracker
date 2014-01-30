'use strict';


// Declare app level module which depends on filters, and services
angular.module('tracker', [
  'snap',
  'wu.masonry',
  'ui.calendar',
  'colorpicker.module',
  'ui.bootstrap',
  'ngRoute',
  'tracker.category',
  'tracker.pryv',
  'tracker.filters',
  'tracker.services',
  'tracker.directives',
  'tracker.controllers'
]).
config([ '$routeProvider', function($routeProvider) {
  $routeProvider.when('/index', {templateUrl: 'partials/partial1.html', controller: 'Masonry'});
  $routeProvider.when('/calendar', {templateUrl: 'partials/partial2.html', controller: 'Calendar'});
  $routeProvider.otherwise({redirectTo: '/index'});
}]).
config(function(snapRemoteProvider) {
  snapRemoteProvider.globalOptions.disable = 'right';
});
