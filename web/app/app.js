'use strict'

var app = angular.module('sub100RealStateSearch', ['ngRoute', 'ngSanitize', 'angularLazyImg'])

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
.config(['lazyImgConfigProvider', function (lazyImgConfigProvider) {
  lazyImgConfigProvider.setOptions({
    errorClass: 'error',
    onError: function (image) {
      var img = $(image['$elem'][0])

      img.attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8XQ8AAnsBfKyAV94AAAAASUVORK5CYII=')
      .closest('figure').addClass('error')
    }
  })
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
