'use strict'

app.controller('homeController', ['$scope', '$http', '$location', '$route', 'helperService', function ($scope, $http, $location, $route, helper) {
  var Controller = {
    vars: {
      db: false
    },
    init: function () {
      $scope.result = this.vars.db.properties
      $scope.real_state_list = this.vars.db.real_state_list
      $scope.updated_at = this.vars.db.updated_at

      $scope.range_price_min = this.vars.db.properties[0].price
      $scope.range_price_max = this.vars.db.properties[this.vars.db.properties.length - 1].price
      $scope.range_prices_list = [ $scope.range_price_min ]

      for (let price = Math.ceil($scope.range_price_min / 100) * 100; price < $scope.range_price_max; price += 100) {
        $scope.range_prices_list.push(price)
      }

      $scope.range_prices_list.push($scope.range_price_max)
    }
  }

  $scope.helper = helper
  $scope.filterResults = function () {
    var filters = {
      type: $('#filter-type').val(),
      rooms: $('#filter-rooms').val(),
      real_state: $('#filter-real-state').val(),
      price_min: $('#filter-price-min').val(),
      price_max: $('#filter-price-max').val()
    }

    var result = Controller.vars.db.properties

    $.each(filters, function (filter, filterValue) {
      switch (filter) {
        case 'type':
          if (filterValue !== '0') {
            result = $.grep(result, function (item) {
              var filteredValue
              switch (filterValue) {
                case '1':
                  filteredValue = 'apartamento'
                  break
                case '2':
                  filteredValue = 'casa'
                  break
                case '3':
                  filteredValue = 'residenciais'
                  break
                default:
              }

              return !filteredValue || item.type.toLowerCase().match(filteredValue)
            })
          }
          break
        case 'rooms':
          if (filterValue !== '0') {
            result = $.grep(result, function (item) {
              var filteredValue = Number(filterValue)

              return !filteredValue || item.rooms === filteredValue
            })
          }
          break
        case 'real_state':
          if (filterValue !== '0') {
            result = $.grep(result, function (item) {
              var filteredValue = Number(filterValue)

              return !filteredValue || item.dealer === filteredValue
            })
          }
          break
        case 'price_min':
          if (filterValue !== '0') {
            result = $.grep(result, function (item) { return item.price >= filterValue })
          }
          break
        case 'price_max':
          if (filterValue !== '0') {
            result = $.grep(result, function (item) { return item.price <= filterValue })
          }
          break
        default:
      }
    })

    $scope.result = result
  }
  $scope.searchRealStateAgency = function (id) {
    id = Number(id)
    if (!Controller.vars.db || !$.isNumeric(id)) {
      return false
    }

    return $.grep(Controller.vars.db.real_state_list, function (item) { return item.id === id }).shift() || false
  }

  $http.get('/app/data/db.json').then(function (response) {
    if (response.status !== 200) {
      throw new Error('Error loading database file.')
    }

    Controller.vars.db = response.data
    Controller.init()
  })
}])
