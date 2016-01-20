/* 
 * Copyright 2015 Space Dynamics Laboratory - Utah State University Research Foundation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
/*global angular,$,console,$compile,$q,$http,$templateCache, app*/
app.directive('searchTopicPopover', ['$compile', '$templateCache', '$q', '$http', 'business', '$timeout', '$rootScope', '$location', '$route', function ($compile, $templateCache, $q, $http, Business, $timeout, $rootScope, $location, $route) {

        //
        // loadDataForPopup: Gets the data from the database needed for this popup.
        //
        var mapped = function (types, key) {
            var found = _.find(types, {'attributeType': key.attributeType});
            if (found) {
                return found;
            } else {
                return key;
            }
        };
        var loadTopicDataForPopup = function (scope) {
            
            $rootScope.getConfig().then(function (config) {
                //console.log("Load Data:",config);
                if (config) {
                    var filterObj = angular.copy(utils.queryFilter);

                    Business.articleservice.getTypes(filterObj, true).then(function (attributeTypes) {
                        scope.topicList = [];
                        _.each(config.topicSearchViews, function (topicSearchItem) {
                            scope.topicList.push(mapped(attributeTypes.data, topicSearchItem));
                        });
                    }, function () {
                        scope.attributeTypes = [];
                        scope.topicList = config.topicSearchViews;

                    });

                }else{
                    scope.topicList = [];
                    scope.attributeTypes = [];
                }

            }, function () {
                Business.brandingservice.getCurrentBrandingView(true).then(function (config) {
                    var filterObj = angular.copy(utils.queryFilter);

                    Business.articleservice.getTypes(filterObj, true).then(function (attributeTypes) {
                        scope.topicList = [];
                        _.each(config.topicSearchViews, function (topicSearchItem) {
                            scope.topicList.push(mapped(attributeTypes.data, topicSearchItem));
                        });
                    }, function () {
                        scope.attributeTypes = [];
                        scope.topicList = config.topicSearchViews;

                    });
                }, function (result) {
//                    console.log("Error Result:", result);
                    scope.topicList = [];
                });
            });
        };

        //
        // getTemplate: Loads in the html file used as a template for the popover and the data to populate the popover.
        //
        var getPopupView = function () {

            var def = $q.defer(), tplate = $templateCache.get("popSearchTopic.html");

            if (typeof tplate === "undefined") {

                $http.get("views/popover/popSearchTopic.html")
                        .success(function (data) {
                            $templateCache.put("popSearchTopic.html", data);
                            def.resolve(data);
                        });
            } else {
                def.resolve(tplate);
            }
            return def.promise;
        };

        return {
            restrict: 'E',
            template: '',
            scope: {
                popVis: "=?visible",
                modalMethod: "&" 
            },
            link: function (scope, element) {

                loadTopicDataForPopup(scope);

                getPopupView().then(function (loadedHTML) {
                    element.html(loadedHTML);
                    $compile(element.contents())(scope);
                });

                scope.currentTopic={};
                scope.loadSubTopicDataForPopup = function (type) {
                    scope.currentTopic=type;
                    scope.$emit('$TRIGGERLOAD', 'topicLoader');
                    Business.articleservice.getCodeViews(type.attributeType).then(function (result) {
                        scope.subTopicList = [];
                        if (result.data) {
                            scope.subTopicList = result.data;
                            scope.$emit('$TRIGGERUNLOAD', 'topicLoader');
                        }
                    }, function () {
                        scope.subTopicList = [];
                        scope.$emit('$TRIGGERUNLOAD', 'topicLoader');
                    });
                    
                };

                scope.goToResults = function (attribute) {
                    //console.log("The Attribute Clicked:",attribute);
                    scope.modalMethod();
                    var searchObj = {
                        "sortField": null,
                        "sortDirection": "DESC",
                        "startOffset": 0,
                        "max": 2147483647,
                        "searchElements": [{
                                "searchType": "ATTRIBUTE",
                                "field": null,
                                "value": null,
                                "keyField": attribute.type,
                                "keyValue": attribute.code,
                                "startDate": null,
                                "endDate": null,
                                "caseInsensitive": false,
                                "numberOperation": "EQUALS",
                                "stringOperation": "EQUALS",
                                "mergeCondition": attribute.condition  //OR.. NOT.. AND..
                            }]
                    };
                    Business.saveLocal('ADVANCED_SEARCH', searchObj);
                    //console.log("Change Location", $location.path());
                    $location.search({});
                    if ($location.path() !== '/results') {
                        $location.path('results');                      
                    } else {
                        $route.reload();
                    }
                };
            }
        };
    }]);



