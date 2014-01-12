'use strict';


// Declare app level module which depends on filters, and services
angular.module('tracker', [
  'snap',
  'wu.masonry',
  'colorpicker.module',
  'ui.bootstrap',
  'ngRoute',
  'tracker.category',
  'tracker.filters',
  'tracker.services',
  'tracker.directives',
  'tracker.controllers'
]).
config([ '$routeProvider', function($routeProvider) {
  $routeProvider.when('/view1', {templateUrl: 'partials/partial1.html', controller: 'Masonry'});
  $routeProvider.when('/view2', {templateUrl: 'partials/partial2.html', controller: 'MyCtrl2'});
  $routeProvider.otherwise({redirectTo: '/view1'});
}]).
config(function(snapRemoteProvider) {
  snapRemoteProvider.globalOptions .disable = 'right';
});
