'use strict';

/* Controllers */

angular.module('tracker.controllers', []).
  controller('Masonry', ['$scope', '$interval', 'Category', function($scope, $interval, Category) {
    Category.init();
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
        if (!_.isNumber($scope.timers[id])) {
          $scope.timers[id] = Category.getRunningTime(activity);
          console.log('init timer', $scope.timers[id], activity);
        }
        if (activity.runningEvent) {
          $scope.timers[id]  += 1;
        }
      })
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
  }])
  .controller('Panel', ['$scope', 'Category', function ($scope, Category) {
    Category.init();
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
  }])
  .controller('MyCtrl2', [function() {

  }]);