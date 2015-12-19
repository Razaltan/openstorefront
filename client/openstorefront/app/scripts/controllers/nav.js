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

/*global setUpDropdown*/

app.controller('NavCtrl', ['$scope', '$location', 'localCache', '$rootScope', 'business', '$route', '$timeout', 'auth', '$draggable', '$uiModal', function ($scope, $location, localCache, $rootScope, Business, $route, $timeout, Auth, $draggable, $uiModal) { /*jshint unused: false*/

  /*******************************************************************************
  * This Controller gives us a place to add functionality to the navbar
  *******************************************************************************/
  //////////////////////////////////////////////////////////////////////////////
  // Variables
  //////////////////////////////////////////////////////////////////////////////
  $scope._scopename   = 'nav';
  $scope.navLocation  = 'views/nav/nav.html';
  $scope.searchKey    = $rootScope.searchKey;
  $scope.user         = {};
  $scope.beforeLogin  = null;
  $scope.typeahead    = null;

  //////////////////////////////////////////////////////////////////////////////
  // Event Watches
  //////////////////////////////////////////////////////////////////////////////
  $scope.$on('$beforeLogin', function(event, path, search){
    $scope.beforeLogin = {};
    $scope.beforeLogin.path = path;
    $scope.beforeLogin.search = search;
    Auth.login($scope.user).then(function () {
    }, function (error) {
      $scope.error = error.toString();
    });

    // $location.path('/login');
  });

  /***************************************************************
  * This function watches for the content loaded event and then checks
  * to see if they're logged in.
  ***************************************************************/
  $scope.$on('$includeContentLoaded', function(event){
    $scope.user.isLoggedIn = Auth.signedIn();
  });

  /***************************************************************
  * This function watches for the login event in order to adjust
  * the navigation and possibly redirect the page back to where they were.
  ***************************************************************/
  $scope.$on('$login', function(event, user){
    $scope.user.info = user;
    $scope.user.isLoggedIn = Auth.signedIn();
    if ($scope.beforeLogin && $scope.beforeLogin.path !== '/login') {
      var temp = $scope.beforeLogin.path;
      var temp2 = $scope.beforeLogin.search;
      $scope.beforeLogin = null;
      $location.search(temp2);
      $location.path(temp);
    } else {
      $scope.beforeLogin = null;
      // $location.search({});
      // $location.path('/');
    }
  });

  $scope.$on('$RESETUSER', function(event, data){
    Business.userservice.getCurrentUserProfile().then(function(result){
      if (result) {
        $scope.user.info = result;
      } else {
        Auth.logout();
      }
    });
  });


  /***************************************************************
  * Catch the enter/select event here
  ***************************************************************/
  $scope.$on('$typeahead.select', function(event, value, index) {
    if (typeof value === 'object') {
      value = '"' + value.description + '"';
    }
    $scope.searchKey = value;
    $rootScope.searchKey = value;
    if (value !== undefined) {
      $scope.goToSearch();
      $scope.$apply();
    } else {
      $scope.goToSearch();
      $scope.$apply();
    }
  });
  


  $scope.getTypeahead = function(){
    Business.typeahead($scope.searchKey).then(function(result){
      result = result || [];
      _.forEach(result, function(item){
        item.description = '"' + item.description + '"';
      });

      $scope.typeahead = result;
    }, function(){
      $scope.typeahead = [];
    });
  };

  $scope.$watch('searchKey', function(newValue, oldValue){
    if ($scope.searchKey) {
      $rootScope.searchKey = $scope.searchKey;
      $scope.getTypeahead();
    }
  });

  /***************************************************************
  * Catch the navigation location change event here
  ***************************************************************/
  $scope.$on('$changenav', function(event, value, index) {
    $scope.navLocation = value;
  });
  
  //////////////////////////////////////////////////////////////////////////////
  // Functions
  //////////////////////////////////////////////////////////////////////////////
  
  $scope.openFeedback = function(){
     var feedbackWin = Ext.create('OSF.component.FeedbackWindow', { 
         closeAction: 'destroy',
         angularScope: $scope
     });     
     feedbackWin.show();      
  };
  
  
  /***************************************************************
  * This function sends the routing to the results page with a specified
  * search key saved in the localCache
  ***************************************************************/
  $scope.goToSearch = function () { /*jshint unused:false*/
            console.log("Made it goto search in navjs");
            $scope.closeNavbarItem('searchNavButton');
            var key = 'All';
            if ($scope.searchKey) {
                key = $scope.searchKey;
                $rootScope.searchKey = $scope.searchKey;
            }
            $location.search({
                'type': 'search',
                'code': key
            });
            $location.path('/results');
        };

  /***************************************************************
  * This function sends the routing to the results page with a specified
  * search key saved in the localCache
  ***************************************************************/
  $scope.goToLogin = function(){ /*jshint unused:false*/
    $location.search({});
    $location.path('/login');
  };

  /***************************************************************
  * This function sends the person home
  ***************************************************************/
  $scope.sendHome = function(){ /*jshint unused:false*/
    Business.componentservice.search('search', $scope.searchKey);
    $location.path('/');
  };

  /***************************************************************
  * This function sends the navigation to a specified route.
  ***************************************************************/
  $scope.send = function(route) {
    $location.path(route);
  };
  
  $scope.gotoAdmin = function() {
    window.location.replace('client/admin.jsp');
  };
  
  $scope.gotoUserTools = function() {
    window.location.replace('client/usertools.jsp');
  };  

  /***************************************************************
  * Log out the user
  ***************************************************************/
  $scope.logout = function () {
    Auth.logout();
    $scope.user.isLoggedIn = false;
    localCache.clearAll();
    window.location.replace('/openstorefront/Login.action?Logout');
  };

  //////////////////////////////////////////////////////////////////////////////
  // Scope Watches
  //////////////////////////////////////////////////////////////////////////////

  /*******************************************************************************
  * This function sets the rootScope's search key so that if you did it in the
  * controller search, it is still preserved across the page.
  * params: param name -- param description
  * returns: Return name -- return description
  *******************************************************************************/
  $rootScope.$watch('searchKey', function() {
    $scope.searchKey = $rootScope.searchKey;
  });

  // We have to manually connect the list item to the dropdown toggle because the
  // routing and nav load somehow delays it which makes the dropdown not work
  // until the second click. This makes it work on first click.
  $scope.$watch('navLocation', function() {
    $timeout(function() {
      setUpDropdown('dropTheMenu');
    }, 500);
  });


  $scope.openHelp = function() {
    var draggableInstance = $draggable.open({
      alwaysontop: true,
      templateUrl: 'views/help.html',
      controller: 'helpCtrl',
      size: 600,
      top: 100,
      left: 50,
      closeTarget: 'closeTarget',
      moveTarget: 'dragTarget',
      id: 'helpWindow',
      resolve: {        
      }
    });  
  };


  /***************************************************************
  * Automatically login the user for the demo... DELETE THIS LATER
  ***************************************************************/
  $scope.$emit('$TRIGGEREVENT','$beforeLogin', $location.path(), $location.search());

}]);
