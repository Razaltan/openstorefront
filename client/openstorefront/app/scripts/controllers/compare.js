/* 
* Copyright 2014 Space Dynamics Laboratory - Utah State University Research Foundation.
*
* Licensed under the Apache License, Version 2.0 (the 'License');
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*      http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an 'AS IS' BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';

/*global triggerAlert*/

app.controller('CompareCtrl', ['$scope', 'business', '$location', function ($scope, Business, $location) {

  $scope.list = $location.search().id ? $location.search().id : Business.getLocal('COMPARE') ? Business.getLocal('COMPARE').id : [];
 // $scope.list = $location.search().id? $location.search().id : [];
  $scope.pair = [];
  $scope.showChoices = false;
  $scope.data = null;
  $scope.id = null;
  $scope.article = null;

  Business.componentservice.batchGetComponentDetails($scope.list).then(function(result){
    if (result && result.length > 0) {
      $scope.data = angular.copy(result);
    } else {
      $scope.data = null;
    }
  });

  var requestChange = function(id, item) {
    // console.log('we changed one!');
    if ($scope.pair && $scope.pair.length === 2 && id !== $scope.pair[1].componentId && id !== $scope.pair[0].componentId) {
      $scope.id = id;
      $scope.item = item;
      $scope.showChoices = true;
    } else {
      triggerAlert('This component is already present in the \'Side By Side\'', 'alreadyPresent', 'body', 1300);
    }
  };

  $scope.resetSide = function(isRight) {
    $scope.showChoices = false;
    if (isRight) {
      $scope.pair[1] = null;
    } else {
      $scope.pair[0] = null;
    }
    $scope.setCompare($scope.id, $scope.item);
    $scope.id = null;
    $scope.item = null;
  };


  $scope.setCompare = function(id, item){
    if (item.type === 'component' && !$scope.showChoices) {
      if (!$scope.pair[0] && !$scope.pair[1]) {
        Business.componentservice.getComponentPrint(id, true).then(function(result){
          $scope.pair[0] = result;
        }, function() {
          $scope.pair[0] = {};
        })
      } else if(!$scope.pair[1] && $scope.pair[0] && id !== $scope.pair[0].componentId) {
        Business.componentservice.getComponentPrint(id, true).then(function(result){
          $scope.pair[1] = result;
        }, function() {
          $scope.pair[1] = {};
        })
        // console.log('$scope.pair[1]', $scope.pair[1]);
      } else if(!$scope.pair[0] && $scope.pair[1] && id !== $scope.pair[1].componentId) {
        Business.componentservice.getComponentPrint(id, true).then(function(result){
          $scope.pair[0] = result;
        }, function() {
          $scope.pair[0] = {};
        })
      } else {
        requestChange(id, item);
      }
    }
  };


}]);
