'use strict'

var app = angular.module('sub100RealStateSearch', ['ngRoute', 'ngSanitize'])

app.config(['$httpProvider', '$routeProvider', function ($httpProvider, $routeProvider) {
  var routes = [{
    url: '/',
    template: 'app/views/home.html',
    controller: 'homeController'
  }]

  $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'

  routes.forEach(function (r, index) {
    $routeProvider.when(r.url, { templateUrl: r.template, controller: r.controller })
  })

  $routeProvider.otherwise({ redirectTo: '/' })
}])
.directive('a', function () {
  return {
    restrict: 'E',
    link: function (scope, elem, attrs) {
      if (attrs.ngClick || attrs.href === '' || attrs.href === '#') {
        elem.on('click', function (e) { e.preventDefault() })
      }
    }
  }
})
