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

/*Until we figure it out, IE9 is having issues uploading files. A warning message has been put in*/
/*There is an issue with Chrome using up all of its sockets when preview files... no workaround*/


'use strict';

/*global isEmpty*/

app.controller('SubmissionCtrl', ['$scope', 'localCache', 'business', '$filter', '$timeout', '$location', '$rootScope', '$q', '$route', '$anchorScroll', 'FileUploader', '$templateCache', '$uiModal', '$sce', '$window',
  function ($scope,  localCache, Business, $filter, $timeout, $location, $rootScope, $q, $route, $anchorScroll, FileUploader, $templateCache, $uiModal, $sce, $window) { /*jshint unused: false*/


  //
  $scope.business = Business;
  $scope.test = 'This is a test';
  $scope.badgeFound = false;
  $scope.lastMediaFile = '';
  $scope.hideMultiSelect = true;

  $scope.editor = {};
  $scope.editor.editorContent = '';
  $scope.editor.editorContentWatch;
  $scope.editorOptions = getCkBasicConfig(false);


  $scope.submitter = {};
  $scope.submitter.firstName;
  $scope.submitter.lastName;
  $scope.submitter.email;
  $scope.submitter.organization;
  $scope.current = 'top';
  $scope.optIn = true;
  $scope.notDif = true;


  $scope.componentId;
  $scope.component = {};
  $scope.backup = {};
  $scope.component.component = {};
  $scope.component.attributes = {};

  $scope.component.metadata = [];
  $scope.metadataForm = {};

  $scope.component.tags = [];
  $scope.tagsForm = {};


  $scope.contactForm = {};
  $scope.component.contacts = [];

  $scope.component.media = [];
  $scope.mediaForm = {};
  $scope.showMediaUpload = 'falseValue';
  $scope.isFull = false;


  $scope.component.resources = [];
  $scope.resourceForm = {};
  $scope.showResourceUpload = 'trueValue';
  $scope.isFullResource = false;


  $scope.dependencyForm = {};
  $scope.component.externalDependencies = [];

  $scope.details = {};

  $scope.formMedia;
  $scope.tempAttribute;
  
  $scope.sendHome = function() {
    window.location.href = "/";
  };

  $scope.addTo = function(item, attr, collection){
    
    if (!collection) {
      collection = {};
      collection[attr.attributeType] = {
        items: []
      }
      collection = collection[attr.attributeType].items;
    } else if (!collection[attr.attributeType]){
      collection[attr.attributeType] = {
        items: []
      }
      collection = collection[attr.attributeType].items;
    } else if (!collection[attr.attributeType].items) {
      collection[attr.attributeType] = {
        items: []
      }
      collection = collection[attr.attributeType].items;
    } else {
      collection = collection[attr.attributeType].items;
    }
    if (!_.isArray(collection)){
      collection = [];
    }
    if (attr.allowMultipleFlg){
      _.contains(collection, item)? '': collection.push(item);
    } else {
      collection[0] = item;
    }
  }
  $scope.removeFrom = function(item, collection){
    collection.splice(item, 1);
  }

  $scope.setEditable = function($event){
      if (!$scope.finishedForm)
      {
        var response = window.confirm("Are you sure you want to resume editing your submission? This action remove your submission from the admin's pending queue and you will have to re-submit it for approval.");
        if (response && $scope.vitalsCheck()) {
          if ($scope.component.component) {
            $scope.component.component.approvalState = 'N';
            $scope.submit(true).then(function () {
              $scope.scrollTo('vitals', 'vitals', '', $event, 'componentName');
            }, function () {
              if ($event) {
                $event.preventDefault();
                $event.stopPropagation();
              }
            })
          }
        } else {
          triggerAlert('You are missing required information. Please review your submission before re-submitting your entry.', 'setEditable', 'body', 6000);
          if ($scope.component.component) {
            $scope.component.component.approvalState = 'N';
            $scope.scrollTo('vitals', 'vitals', '', $event, 'componentName');
          }
        }
      }
  }

  $scope.setupTagList = $scope.setupTagList || function() {
    Business.getTagsList(true).then(function(result) {
      if (result) {
        $scope.tagsList       = result;
        $scope.tagsList.sort();
      } else {
        $scope.tagsList       = null;
      }
    });
  }
  $scope.setupTagList();

  $scope.checkTagsList = $scope.checkTagsList || function(query, list, source) {
    var deferred = $q.defer();
    var subList = null;
    if (query === ' ') {
      subList = _.reject(source, function(item) {
        return !!(_.where(list, {'text': item}).length);
      });
    } else {
      subList = _.filter(source, function(item) {
        return item.toLowerCase().indexOf(query.toLowerCase()) > -1;
      });
    }
    deferred.resolve(subList);
    return deferred.promise;
  };


  $scope.getMediaHTML = function(media){
    return utils.getMediaHTML(media, $sce);
  }

  $scope.getResourceHTML = function(resource){
    return utils.getResourceHTML(resource, $sce);
  }

  $scope.getUserInfo = function(){
    var deferred = $q.defer();
    Business.userservice.getCurrentUserProfile().then(function(result){
      if (result) {

        $scope.userInfo = result;
        deferred.resolve(result);
        // console.log('result', result);
      }
    }, function(result){
      $scope.userInfo = null;
      deferred.reject(result);
    });
    return deferred.promise;
  }

  $scope.leaveOverride = false;

  $scope.getUserInfo().then(function(result){
    window.onbeforeunload = function (event) {
      if ($scope.leaveOverride) {
      } else if (($scope.userInfo && !$scope.notDif) || (!$scope.userInfo && (!$scope.component.component.approvalState || $scope.component.component.approvalState === 'N'))) {
        var message
        if (!$scope.notDif) {
          message = 'Important!: Some content has changed for your component and has not yet been saved. Please save this content before leaving.';
        } else if (!$scope.userInfo){
          message = 'Important!: We\'ve someohow lost a connection to your user account and your component has not yet been submitted. To ensure that we don\'t lose your progress, please finish the form and click on the \'Submit Component\' to submit your component.';
        } else {
          message = 'Important!: Your progress ahs been saved, but your comoponent has not yet been submitted. You can come back to this form later through the user menu, or you can finish the form and click the \'Submit Component\' button to submit your component.';
        }
        if (typeof event == 'undefined') {
          event = window.event;
        }
        if (event) {
          event.returnValue = message;
        }
        return message;
      }
    }
  }, function(result){
    window.onbeforeunload = function (event) {
      if ($scope.leaveOverride) {
      } else if (!$scope.component.component.approvalState || $scope.component.component.approvalState === 'N') {
        var message = 'Important: Please finish the form and click on the \'Save Component\' button before leaving this page. Otherwise your component will not be submitted and your work will be lost.';
        if (typeof event == 'undefined') {
          event = window.event;
        }
        if (event) {
          event.returnValue = message;
        }
        return message;
      } else if ($scope.component.component.approvalState && $scope.component.component.approvalState !== 'N'){
        var message = 'Important: Once you leave this page, you will no longer be able to adjust your component submission.';
        if (typeof event == 'undefined') {
          event = window.event;
        }
        if (event) {
          event.returnValue = message;
        }
        return message;
      }
    }
  })

$scope.getSubmission = function(){
  var deferred = $q.defer();
  if ($scope.componentId !== null && $scope.componentId !== undefined){
    Business.submissionservice.getSubmission($scope.componentId, true).then(function(result){
      $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 100000);
      if (result && result.component && result.component.componentId){
        $scope.backup = angular.copy(result);
        $scope.backup.media = _.uniq($scope.backup.media, 'componentMediaId');              
        $scope.backup.resources = _.uniq($scope.backup.resources, 'resourceId');              
        $scope.componentId = result.component.componentId;
        $scope.component = angular.copy(result);
        // console.log('$scope.component', $scope.component);
        
        $scope.component.media = _.uniq($scope.component.media, 'componentMediaId');
        $scope.component.resources = _.uniq($scope.component.resources, 'resourceId');
        $scope.hideMultiSelect = true;
        $scope.component.attributes = $scope.setupAttributes($scope.component.attributes);
        console.log('$scope.component.attributes', $scope.component.attributes);
        
        $scope.hideMultiSelect = false;
        if ($scope.component.component.approvalState && $scope.component.component.approvalState !== 'N') {
          $scope.scrollTo('top', 'top', '', null);
          $scope.component.component.approvalState = 'N'; 
          //$scope.scrollTo('reviewAndSubmit', 'submit', '', null);
        }
      }
      deferred.resolve();
    }, function(data){
      // console.log('data', data);

      if (data.status === 403) {
        var confirmation = window.confirm('You were not logged in or not the owner of this component submission. Please log in and return to this submission form through the user menu.');
        $scope.leaveOverride = true;
        window.location = "";
      }
      $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 100000);
      deferred.reject();
    });
    }//
    return deferred.promise;
  }

  $scope.init = function(){
    if ($location.search() && $location.search().id){
      // console.log('$location', $location.search());
      $scope.componentId = $location.search().id;
      $scope.$emit('$TRIGGERLOAD', 'submissionLoader', 'Saving progress');
      $scope.getSubmission().then(function(){
        var found = _.find($scope.component.contacts, {'contactType':'SUB'});
        if (found){
          $scope.submitter = found;
        } else {
          $scope.submitter = {};
          $scope.getUserInfo().then(function(userInfo){
            $scope.submitter.firstName = userInfo.firstName;
            $scope.submitter.lastName = userInfo.lastName;
            $scope.submitter.email = userInfo.email;
            $scope.submitter.organization = userInfo.organization;
            $scope.submitter.phone = userInfo.phone;;
          }, function(){
          })
        }
        $scope.optIn = $scope.component.component.notifyOfApprovalEmail? true: false;
      }, function(){
        $scope.componentId = null;
      });
    } else {
      $scope.submitter = {};
      $scope.getUserInfo().then(function(userInfo){
        $scope.submitter.firstName = userInfo.firstName;
        $scope.submitter.lastName = userInfo.lastName;
        $scope.submitter.email = userInfo.email;
        $scope.submitter.organization = userInfo.organization;
        $scope.submitter.phone = userInfo.phone;        
      }, function(){
      })
      $scope.componentId = null;
    }
  }

  $scope.loadLookup = function(lookup, entity, loader){
    var deferred = $q.defer();
    Business.lookupservice.getLookupCodes(lookup, 'A').then(function (results) {
      deferred.resolve();
      if (results) {
        $scope[entity]= results;
      }        
    });      
    return deferred.promise;
  };
  $scope.getAttributes = function (override) { 
    var deferred = $q.defer();
    Business.getFilters(override, false).then(function (result) {
      $scope.allAttributes = result ? angular.copy(result) : [];
      $scope.requiredAttributes = _.filter($scope.allAttributes, {requiredFlg: true, hideOnSubmission: false});
      $scope.attributes = _.filter($scope.allAttributes, {requiredFlg: false});
      var temp = $filter('requiredByComponentType')($scope.requiredAttributes,'COMP',true);
      _.each(temp, function(thing){
        if (!thing.hideOnSubmission) {
          $scope.attributes.push(thing);
        }
      })
      $scope.attributes.sort(function(a, b){
        var nameA=a.description.toLowerCase(), nameB=b.description.toLowerCase()
        if (nameA < nameB)
          return -1 
        if (nameA > nameB)
          return 1
        return 0 
      })
      deferred.resolve();
    });
    return deferred.promise;
  }; 

  // WHERE WE CALL INIT()!
  (function(){
    $q.all($scope.getAttributes(),
    //
    $scope.loadLookup('ContactType', 'contactTypes', 'submissionLoader'),
    $scope.loadLookup('MediaType', 'mediaTypes', 'submissionLoader'),
    // $scope.loadLookup('SecurityMarkingType', 'securityTypes', 'generalFormLoader'),
    $scope.loadLookup('ResourceType', 'resourceTypes', 'submissionLoader')).then(function(){
      $scope.init();
    })
  })()


  $scope.getSecurityDesc = function(type){
    var found = _.find($scope.securityTypes, {'code': type});
    return found? found.description : type; 
  }

  $scope.formFocused = function(form, reset){

    var keys = _.keys(form);
    if (!reset){
      for (var i = 0; i < keys.length; i++){
        if (keys[i][0] !== '$'){
          if (form[keys[i]].$focused){
            return true;
          }
        }
      }
      return false;
    } else {
      // console.log('form', form);
      // console.log('form', $scope);
      for (var i = 0; i < keys.length; i++){
        if (keys[i][0] !== '$'){
          form[keys[i]].$hasBeenFocused = false
        }
      }
    }
  }

  $scope.getMimeTypeClass = function(type){
    return utils.getMimeTypeClass(type);
  }

  $scope.setBadgeFound = function(attribute){
    if (attribute && attribute.badgeUrl) {
      $scope.badgeFound = true;
    }
  }

  $scope.getAttributeTypeDesc = function(type){
    var found = _.find($scope.allAttributes, {'attributeType': type});
    if (found) {
      return found.description;
    }
    return '';
  }

  $scope.getResourceTypeDesc = function(type){
    var found = _.find($scope.resourceTypes, {'code': type});
    if (found) {
      return found.description;
    }
    return '';
  }

  $scope.getMediaTypeDesc = function(type){
    var found = _.find($scope.mediaTypes, {'code': type});
    if (found) {
      return found.description;
    }
    return '';
  }

  $scope.initialSave = function($event){
    if ($scope.vitalsCheck()){
      $scope.submit(true).then(function(){
        $scope.scrollTo('details', 'vitals', '', $event, 'tagLabel');
        $scope.current = 'extra';
      }, function(){
        if($event) {
          $event.preventDefault();
          $event.stopPropagation();
        }
      })
      _.each($scope.mediaUploader.queue, function(){
        $scope.$emit('$TRIGGERLOAD', 'submissionLoader', 'Uploading Files')
      })
      $scope.mediaUploader.uploadAll();
      _.each($scope.resourceUploader.queue, function(){
        $scope.$emit('$TRIGGERLOAD', 'submissionLoader', 'Uploading Files')
      })
    } 
  }

  $scope.updateSave = function($event){
    if ($scope.vitalsCheck()){
      $scope.submit(false).then(function(){
        $scope.scrollTo('reviewAndSubmit', 'submit', '', $event)
        $scope.detailsDone = true;
      }, function(){
        if($event) {
          $event.preventDefault();
          $event.stopPropagation();
        }
      })
      _.each($scope.mediaUploader.queue, function(){
        $scope.$emit('$TRIGGERLOAD', 'submissionLoader', 'Uploading Files')
      })
      $scope.mediaUploader.uploadAll();
      _.each($scope.resourceUploader.queue, function(){
        $scope.$emit('$TRIGGERLOAD', 'submissionLoader', 'Uploading Files')
      })
      $scope.resourceUploader.uploadAll();
    } 
  }

  $scope.finalSave = function($event){
    if ($scope.vitalsCheck()){
      $scope.submitForAproval(false).then(function(){
        $scope.scrollTo('reviewAndSubmit', 'submit', '', $event)
        $scope.detailsDone = true;
        $scope.current='thanks';
        $scope.finishedForm = true;
        $scope.leaveOverride = true;
      }, function(){
        if($event) {
          $event.preventDefault();
          $event.stopPropagation();
        }
      })
      _.each($scope.mediaUploader.queue, function(){
        $scope.$emit('$TRIGGERLOAD', 'submissionLoader', 'Uploading Files')
      })
      $scope.mediaUploader.uploadAll();
      _.each($scope.resourceUploader.queue, function(){
        $scope.$emit('$TRIGGERLOAD', 'submissionLoader', 'Uploading Files')
      });
    }; 
  };
  
  $scope.newSubmission = function(){
    $window.location.reload();
  };

  $scope.createInitialSubmit = function(){
    $scope.component.component = $scope.component.component || {};
    $scope.component.component.activeStatus = $scope.component.activeStatus || 'A';
    if ($scope.componentId) {
      $scope.component.component.componentId = $scope.componentId; 
    }
    var component = angular.copy($scope.component);
    component.attributes = $scope.getCompactAttributes(true);
    _.each($scope.allAttributes, function(attribute) {
      if (attribute.hideOnSubmission) {
        var found = _.find(attribute.codes, {'code':attribute.defaultAttributeCode});
        var exists = _.find(component.attributes, {'attributeType': attribute.attributeType});
        if (found && !exists) {
          component.attributes.push({
            componentAttributePk: {
              attributeCode: found.code,
              attributeType: attribute.attributeType
            }
          });
        }
      }
    });
    var submitter = angular.copy($scope.submitter);
    submitter.contactType = 'SUB';

    var found = _.find(component.contacts, {'contactType': 'SUB'});
    if (found) {
      var index = _.indexOf(component.contacts, found);
      component.contacts[index] = submitter
    } else {
      component.contacts.push(submitter);
    }
    

    var deferred = $q.defer();

    deferred.resolve(component);

    return deferred.promise;
  }

  $scope.$watch('component', function(){
    $scope.notDifferent();
  }, true);
  
  $scope.$watch('optIn', function(){
    $scope.notDifferent();
  })

  $scope.notDifferent = function(){
    $scope.createInitialSubmit().then(function(component){
      // console.log('checking diff');
      
      var compare = angular.copy(component);
      for(var i = 0; i < compare.attributes.length; i++){
        compare.attributes[i] = {
          componentAttributePk: compare.attributes[i].componentAttributePk
        };
      }
      if ($scope.optIn) {
        compare.component.notifyOfApprovalEmail = $scope.submitter.email;
      } else if (compare.component.notifyOfApprovalEmail){
        delete compare.component.notifyOfApprovalEmail;
      }
      // console.log('dif', _.diff(compare, $scope.backup));
      // console.log('second dif', $scope.difMinusAttributes(_.diff($scope.backup, compare)));
      // console.log('compare', compare);
      // console.log('backup', $scope.backup);
      if (!_.diff(compare,$scope.backup) && !$scope.difMinusAttributes(_.diff($scope.backup, compare))) {
        $scope.notDif = true;
        return;
      }
      $scope.notDif = false;
    });
  }

  $scope.difMinusAttributes = function(diff){
    delete diff.attributes;
    return !angular.equals(diff, {});
  }

  $scope.submit = function(initial){
    $scope.$emit('$TRIGGERLOAD', 'submissionLoader', 'Saving progress');
    var deferred = $q.defer();
    if (initial){
      $scope.createInitialSubmit().then(function(component){
        var compare = angular.copy(component);
        for(var i = 0; i < compare.attributes.length; i++){
          compare.attributes[i] = {
            componentAttributePk: compare.attributes[i].componentAttributePk
          };
        }
        if ($scope.optIn) {
          compare.component.notifyOfApprovalEmail = $scope.submitter.email;
        } else {
          if (compare.component.notifyOfApprovalEmail){
            delete compare.component.notifyOfApprovalEmail;
          }
        }
        
        //console.log('compare', compare);
        if (_.diff(compare,$scope.backup) || $scope.difMinusAttributes(_.diff($scope.backup, compare))) {
          delete compare.component.trigger;
          $scope.notDif = false;
          Business.submissionservice.createSubmission(compare).then(function(result){
            if (result && result.component && result.component.componentId){
              // console.log('result', result);
              $scope.backup = angular.copy(result);
              $scope.backup.media = _.uniq($scope.backup.media, 'componentMediaId');              
              $scope.backup.resources = _.uniq($scope.backup.resources, 'resourceId');              
              $scope.componentId = result.component.componentId;
              $scope.component = angular.copy(result);
              $scope.component.media = _.uniq($scope.component.media, 'componentMediaId');              
              $scope.component.resources = _.uniq($scope.component.resources, 'resourceId');              
              $scope.hideMultiSelect = true;
              $scope.component.attributes = $scope.setupAttributes($scope.component.attributes);
              $scope.hideMultiSelect = false;
              $scope.notDif = true;
            }
            $timeout(function(){
              $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 100000);
            }, 2000);
            deferred.resolve();
          }, function(result){
            $timeout(function(){
              $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 100000);
            }, 2000);
            deferred.reject();
          });
        } else {//
          $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 100000);
          deferred.resolve();
        }
      })
    } else {//
      $scope.createInitialSubmit().then(function(component){
        // console.log('$scope.component', component);
        var compare = angular.copy(component);
        compare.attributes = $scope.getCompactAttributes(true);
        // console.log('compare', compare);
        
        if ($scope.optIn) {
          // console.log('we opted in');
          compare.component.notifyOfApprovalEmail = $scope.submitter.email;
        }  else {
          if (compare.component.notifyOfApprovalEmail){
            delete compare.component.notifyOfApprovalEmail;
          }
        }
        compare.contacts = compare.contacts || [];
        _.each(compare.contacts, function(contact){
          if (contact.contactType && contact.contactType.code){
            contact.contactType = contact.contactType.code;
          } else if (contact.contactType) {
          }
        })
        for(var i = 0; i < compare.attributes.length; i++){
          compare.attributes[i] = {
            componentAttributePk: compare.attributes[i].componentAttributePk
          };
        }
        if (_.diff(compare,$scope.backup) || $scope.difMinusAttributes(_.diff($scope.backup, compare))) {
          delete compare.component.trigger;
          // console.log('UPDATE Diff', compare);
          // console.log('UPDATE Diff', $scope.backup);
          // console.log('UPDATE Diff', _.diff(compare,$scope.backup) || $scope.difMinusAttributes(_.diff($scope.backup, compare)));
          // console.log('component', component);
          $scope.notDif = false;
          Business.submissionservice.updateSubmission(compare).then(function(result){
            if (result && result.component && result.component.componentId){
              $scope.backup = angular.copy(result);
              $scope.backup.media = _.uniq($scope.backup.media, 'componentMediaId');              
              $scope.backup.resources = _.uniq($scope.backup.resources, 'resourceId');              
              $scope.componentId = result.component.componentId;
              $scope.component = angular.copy(result);
              $scope.component.media = _.uniq($scope.component.media, 'componentMediaId');              
              $scope.component.resources = _.uniq($scope.component.resources, 'resourceId');              
              $scope.hideMultiSelect = true;
              $scope.component.attributes = $scope.setupAttributes($scope.component.attributes);
              $scope.hideMultiSelect = false;
              $scope.notDif = true;
            }
            $timeout(function(){
              $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 100000);
            }, 2000);

            deferred.resolve();
            // console.log('Success result', result);
          }, function(result){
            $timeout(function(){
              $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 100000);
            }, 2000);
            deferred.reject();
            // console.log('Fail result', result);
          });
        } else {//
          $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 100000);
          // console.log('The component did not change', compare, $scope.backup);
          deferred.resolve();
        }
      })
    }//
    return deferred.promise;
  }

  $scope.submitForAproval = function(){
    var deferred = $q.defer();
    $scope.submit(false).then(function(){
      if ($scope.component && $scope.component.component && $scope.component.component.componentId) {
        // console.log('component', $scope.component);
        
        Business.submissionservice.submit($scope.component.component.componentId).then(function(){
          $scope.backup.component.approvalState = 'P';              
          $scope.component.component.approvalState = 'P';
          //triggerAlert('Your component has been successfully submitted!', 'submitAlert', 'body', 8000);
          deferred.resolve();
        }, function(result){
          deferred.reject();
        });
      } else {
        deferred.reject();
      }
    })
    return deferred.promise;
  }



  $scope.$watch('current', function(){
    $scope.badgeFound = false;
    if ($scope.current && $scope.current === 'submit') {
      $scope.badgeFound = false;
      _.each($scope.component.attributes, function(attribute){
        $scope.setBadgeFound(attribute);
      })
    }
  })

  $scope.makeThisHappen = function(canHappen, form, func){
    if (canHappen){
      func(form);
      $scope.formFocused(form, true);
    }
  }



  $scope.checkAttributes = function(){
    // console.log('Compact list', _.compact($scope.component.attributes));
    // we need to compact the attributes list because it may have unused indexes.
    if ($scope.component) {
      var list = angular.copy($scope.component.attributes);
      list = _.remove(_.compact(_.pluck(list, 'items')), function(item){
        return item.length;
      });
      // console.log('list', list);
      
      var requiredAttributes = [];
      if (list && list.length) {
        _.each(list, function(item){
          if (item && item.length){
            requiredAttributes.push(item[0]);
          }
        })
        requiredAttributes = _.filter(requiredAttributes, function(n){
          if (n) {
            return n.requiredFlg && !n.hideOnSubmission;
          } else {
            return false;
          }
        });
        requiredAttributes = $filter('requiredByComponentType')(requiredAttributes, 'COMP', false);
        if (requiredAttributes && requiredAttributes.length === $filter('requiredByComponentType')($scope.requiredAttributes, 'COMP', false).length) {
          return true;
        }
      }
    } 
    return false;
  }

  $scope.setDefaultAttribute = function(index, attribute, required){

    if (required && !$scope.component.attributes[index]) {
      var found = _.find($scope.requiredAttributes, {'attributeType': attribute.attributeType});
      if (attribute.defaultAttributeCode) {
        found = _.find(attribute.codes, {code: attribute.defaultAttributeCode});
        if (found) {
          $scope.component.attributes[index] = found;
        }
      }
    } else {
      var found = _.find($scope.attributes, {'attributeType': attribute.attributeType});
      if (attribute.defaultAttributeCode) {
        found = _.find(attribute.codes, {code: attribute.defaultAttributeCode});
        if (found) {
          $scope.component.attributes[index] = found;
        }
      }
    }
  }

  $scope.getCompactAttributes = function(attributePK){
    // This is how we'll weed out the attributes we need for the submission
    var realAttributes = $scope.component.attributes;
    var attributes = [];
    _.each(realAttributes, function(attr){
      if (attr) {
        if (_.isArray(attr.items) ){
          _.each(attr.items, function(item){
            if (attributePK && !item.componentAttributePk) {
              item.componentAttributePk = {
                'attributeType': item.attributeType,
                'attributeCode': item.code,
              };
            }
            attributes.push(item);
          })
        } else {
          if (attributePK && !attr.componentAttributePk) {
            attr.componentAttributePk = {
              'attributeType': attr.attributeType,
              'attributeCode': attr.code,
            };
          }
          attributes.push(attr);
        }
      }
    })

    
    return attributes;      
  }

  $scope.setupAttributes = function(attributes){
    console.log('attributes', attributes);
    
    var result = {};
    // cycle through the given attributes on a component to merge the models for the form/view/directives etc...
    _.each(attributes, function(attribute){
      // if the attribute is found within our list of attributes
      var foundAttr = _.find($scope.allAttributes, {'attributeType': attribute.componentAttributePk.attributeType});
      // console.log('found', foundAttr);
      
      if (foundAttr) {
        // grab the new model through our filter
        var foundAttr = $filter('makeattribute')(foundAttr.codes, foundAttr);
        // find the code we were given
        var found = _.find(foundAttr, {'code': attribute.componentAttributePk.attributeCode});
        // and merge them
        var merged = _.merge(found, attribute);
        if (!result[attribute.componentAttributePk.attributeType] || !result[attribute.componentAttributePk.attributeType].items) {
          result[attribute.componentAttributePk.attributeType] = {items:[]};
        }
        result[attribute.componentAttributePk.attributeType].items.push(merged);
      }
    })

    //This is what resolved the angular error.
    // for each attribute in our list
    _.each($scope.allAttributes, function(attribute){
      // make sure it exists in the array so that angular is happy...
      result[attribute.attributeType] = result[attribute.attributeType] || {items:[]};
    })
    console.log('attributes after', result);

    return result;
  }

  $scope.getComponent = function(){
    return JSON.stringify($scope.component, null, 4);
  }

  // Metadata section
  $scope.removeMetadata = function(index){
    if (!($scope.component.component.approvalState && $scope.component.component.approvalState !== 'N')) {

      $scope.component.metadata.splice(index, 1);
    }
  }
  $scope.addMetadata = function(form){
    if ($scope.metadataForm.value && $scope.metadataForm.label) {
      $scope.component.metadata.push($scope.metadataForm);
      $scope.metadataForm = {};
      $scope.formFocused(form, true)
      $('#metadataLabel').focus();
    }
  }

  // tag section
  $scope.removeTag = function(index){
    if (!($scope.component.component.approvalState && $scope.component.component.approvalState !== 'N')) {
      $scope.component.tags.splice(index, 1);
    }
  }
  $scope.addTag = function(form){
    if ( $scope.tagsForm.text && $scope.tagsForm.text[0].text) {
      var found = _.find($scope.component.tags, {'text':$scope.tagsForm.text[0].text});
      if (!found) {
        $scope.component.tags.push($scope.tagsForm.text[0]);
        $scope.tagsForm = {};
        $scope.formFocused(form, true)
        $('#tagLabel').focus();
      } else {
        $scope.tagsForm = {};
      }
    } else {
      $scope.tagsForm = {};
    }
  }

  // contact section
  $scope.getContactTypeDesc = function(type){
    var found = _.find($scope.contactTypes, {'code': type});
    return  found? found.description : type;
  }
  $scope.removeContact = function(index){
    if (!($scope.component.component.approvalState && $scope.component.component.approvalState !== 'N')) {
      $scope.component.contacts.splice(index, 1);
    }
  }
  $scope.addContact = function(form){
    if ( $scope.contactForm ) {
      $scope.component.contacts.push($scope.contactForm);
      $scope.contactForm = {};
      $scope.formFocused(form, true)
      $('#contactType').focus();
    }
  }
  $scope.getContactType = function(type){
    var found = _.find($scope.contactTypes, {'code': type});
    return found? found.description: type;
  }


  // Media section
  $scope.oldMediaState = $scope.showMediaUpload;
  $scope.toggleShowMedia = function(val){
    if (val !== $scope.oldMediaState) {
      $scope.oldMediaState = val;
      $('#mediaUploadInput').val(null);
      $scope.mediaForm.mediaTypeCode = null;
      $scope.mediaForm.caption = null;
      $scope.mediaForm.link = null;
      // $scope.mediaForm.securityMarkingType = null;
      $scope.lastMediaFile = '';
    }
  }


  $scope.resetMediaInput = function(){
    $('#mediaUploadInput').val(null);
    $scope.mediaForm.mediaTypeCode = null;
    $scope.mediaForm.caption = null;
    // $scope.mediaForm.securityMarkingType = null;
    $scope.lastMediaFile = '';
  }

  $scope.addLinkToMedia = function(){
    $scope.component.media.push(angular.copy($scope.mediaForm));
    $('#mediaUploadInput').val(null);
    $scope.mediaForm.mediaTypeCode = null;
    $scope.mediaForm.link = null;
    $scope.mediaForm.caption = null;
    // $scope.mediaForm.securityMarkingType = null;
    $scope.lastMediaFile = '';
  }  


  // Resource section
  $scope.oldResourceState = $scope.showResourceUpload;
  $scope.toggleShowResource = function(val){
    if (val !== $scope.oldResourceState) {
      $scope.oldResourceState = val;
      $('#resourceUploadInput').val(null);
      $scope.resourceForm.resourceType = null;
      $scope.resourceForm.description = null;
      $scope.resourceForm.link = null;
      // $scope.resourceForm.securityMarkingType = null;
      $scope.lastResourceFile = '';
    }
  }


  $scope.resetResourceInput = function(){
    $('#resourceUploadInput').val(null);
    $scope.resourceForm.resourceType = null;
    $scope.resourceForm.description = null;
    // $scope.resourceForm.securityMarkingType = null;
    $scope.lastResourceFile = '';
  }

  $scope.addLinkToResource = function(){
    $scope.component.resources.push(angular.copy($scope.resourceForm));
    $('#resourceUploadInput').val(null);
    $scope.resourceForm.resourceType = null;
    $scope.resourceForm.link = null;
    $scope.resourceForm.description = null;
    // $scope.resourceForm.securityMarkingType = null;
    $scope.lastResourceFile = '';
  }

  // contact section
  $scope.removeDependency = function(index){
    if (!($scope.component.component.approvalState && $scope.component.component.approvalState !== 'N')) {
      $scope.component.externalDependencies.splice(index, 1);
    }
  }
  $scope.addDependency = function(form){
    // console.log('$scope.dependencyForm', $scope.dependencyForm);
    
    if ( $scope.dependencyForm ) {
      $scope.component.externalDependencies.push($scope.dependencyForm);
      $scope.formFocused(form, true)
      $scope.dependencyForm = {};
      $('#dependencyFormName').focus();
    }
  }

  // validation section
  $scope.getStarted = function(){
    // return true;
    return $scope.submitter.firstName && $scope.submitter.lastName && $scope.submitter.email && $scope.submitter.phone && $scope.submitter.organization;
  }

  $scope.vitalsCheck = function(log){
    // return true;
    if (false){
      // console.log('getStarted', $scope.getStarted());
      // console.log('component', $scope.component);
    }
    
    return $scope.getStarted() && $scope.component && $scope.component.component && $scope.component.component.name && $scope.component.component.description && $scope.component.component.organization && $scope.checkAttributes();
  }




  $scope.openInfo = function(attribute){
    var modalInstance = $uiModal.open({
      template: $templateCache.get('submission/attributesinfo.tpl.html'),
      controller: 'AttrsInfoCtrl',
      size: 'sm',
      resolve: {
        size: function() {
          return 'sm';
        },
        attribute: function() {
          return attribute;
        }
      }
    });

    modalInstance.result.then(function (result) {
    }, function () {
    });
  }

  
  $scope.getCodesForType = function(type){
    var foundType = _.find($scope.allAttributes, {attributeType: type});
    return foundType !== undefined ? foundType.codes : [];
  }; 





  // Media Handling functions
  $scope.srcList = []; //
  $scope.queue = [];
  $scope.resourceQueue = [];
  $scope.addMedia = function (inputFile, queue, form, loader, caption, typeCode) { //
  // $scope.addMedia = function (inputFile, queue, form, loader, caption, securityMarkingType, typeCode) { //
    // if ($scope.mediaForm.link || 
    //   $scope.mediaUploader.queue.length === 0) {

    //   if (!$scope.mediaForm.link) {          
    //     $scope.mediaForm.originalName = $scope.mediaForm.originalFileName;  
    //   } else {
    //     $scope.mediaForm.mimeType = '';
    //   }

      // $scope.saveEntity({
      //   alertId: 'saveMedia',
      //   alertDiv: 'componentWindowDiv',
      //   loader: 'submissionLoader',
      //   entityName: 'media',
      //   entity: $scope.mediaForm,
      //   entityId: $scope.mediaForm.componentMediaId,
      //   formName: 'mediaForm',
      //   loadEntity: function () {
      //     $scope.loadMedia();
      //   }
      // });
    // } else {
      var file = {}
      file[typeCode] = $scope[form][typeCode];
      file[caption] = $scope[form][caption];
      // file[securityMarkingType] = $scope[form][securityMarkingType];
      file.mimeType = inputFile._file? inputFile._file.type: inputFile.file.type;
      
      if (inputFile._file){
        $scope.readFile(inputFile._file, function(result){
          queue.push({'file': file, 'dom':result});
          if(!$rootScope.$$phase) {
            $scope.$apply();
          }
          $scope.$emit('$TRIGGERUNLOAD', loader, 6000);
        });
      } else {
        queue.push({'file': file, 'dom':'<span>No Link or Preview Available</span>'});
        if(!$rootScope.$$phase) {
          $scope.$apply();
        }
        $scope.$emit('$TRIGGERUNLOAD', loader, 6000);
      }
      // $scope.mediaUploader.uploadAll();
    // }
  };

  $scope.readFile = function(file, callback){

    var reader;
    if (file.type.match('image.*')) {
      // console.log('file ===  image', file);
      var reader = new FileReader();
      // Closure to capture the file information.
      reader.onload = (function(theFile, callback) {

        return function(e) {
          // Render thumbnail.
          callback(
           ['<img class="thumb" src="', e.target.result,'" title="', escape(theFile.name), '" width="230"    height="270"/>'].join('')
           )
        };
      })(file, callback);
      reader.readAsDataURL(file);
    }else if (file.type.match('audio.*')){
      var reader = new FileReader();
      // Closure to capture the file information.
      reader.onload = (function(theFile, callback) {
        return function(e) {
          // Render thumbnail.

          callback(
            ['<audio controls><source src="', e.target.result,'   "type="audio/ogg"><source src="', e.target.result,' "type="audio/mpeg"></audio>'].join('')
            )
        };
      })(file, callback);
      reader.readAsDataURL(file);
    }else if (file.type.match('video.*')){
      var URL = window.URL || window.webkitURL;
      var type = file.type;

      var videoNode = document.createElement('video');

      var canPlay = videoNode.canPlayType(type);

      canPlay = (canPlay === '' ? 'no' : canPlay);

      var message = 'Can play type "' + type + '": ' + canPlay;

      var isError = canPlay === 'no';

      // console.log(message, isError);

      if (isError) {
        return;
      }

      var fileURL = URL.createObjectURL(file);
      if (!URL) {
        callback('<span>Your browser is not <a href="http://caniuse.com/bloburls">supported</a>!</span>')
      }   
      var srcs = [];
      srcs.push({src: $sce.trustAsResourceUrl(fileURL).$$unwrapTrustedValue(), type: 'video/mp4'});             
      srcs.push({src: $sce.trustAsResourceUrl(fileURL).$$unwrapTrustedValue(), type: 'video/webm'});             
      srcs.push({src: $sce.trustAsResourceUrl(fileURL).$$unwrapTrustedValue(), type: 'video/ogg'});             
      callback(
        ['<videogular> <vg-media vg-src=\''+JSON.stringify(srcs)+'\' vg-preload="\'none\'" vg-native-controls="true"></vg-media></videogular>'].join('')
        )
    } else {
      callback('<span>No Link or Preview Available</span>')
    }
  }

  $scope.removeFromQueue = function(file){
    if (!($scope.component.component.approvalState && $scope.component.component.approvalState !== 'N')) {
      var found = _.find($scope.mediaUploader.queue, file.file);
      if (found){
        found = _.indexOf($scope.mediaUploader.queue, found);
        $scope.mediaUploader.queue.splice(found, 1);
      }
      found = _.find($scope.queue, file);
      if (found){
        found = _.indexOf($scope.queue, found);
        $scope.queue.splice(found, 1);
      }
    }
  }

  $scope.hardDeleteEntity = function(options){
    var response = window.confirm("Are you sure you want to DELETE "+ options.entityName + "?");
    if (response && $scope.componentId) {
      $scope.$emit('$TRIGGERLOAD', options.loader, 'Loading data');
      Business.submissionservice.forceRemoveEnity({
        componentId: $scope.componentId,
        entity: options.entityPath,
        entityId: options.entityId
      }).then(function (result) {          
        $scope.$emit('$TRIGGERUNLOAD', options.loader, 6000);
        options.loadEntity();
      });
    }
  };

  $scope.deleteMedia = function(media){
    if (!($scope.component.component.approvalState && $scope.component.component.approvalState !== 'N')) {

      if (media.componentMediaId) {
        $scope.hardDeleteEntity({
          loader: 'submissionLoader',
          entityName: 'Media',
          entityPath: 'media',
          entityId: media.componentMediaId,
          loadEntity: function(){
            $scope.getSubmission();
          }        
        }); 
      } else {
        var found = _.find($scope.component.media, media);
        if (found){
          // console.log('found', found);
          found = _.indexOf($scope.component.media, found);
          $scope.component.media.splice(found, 1);
        }
      }
    }; 
  }; 

  // media uploader
  $scope.mediaUploader = new FileUploader({ //
    url: 'Media.action?UploadMedia',
    alias: 'file',
    queueLimit: 50,  
    removeAfterUpload: true,
    onAfterAddingFile: function(file){
      // console.log('We loaded the loader!', file.file);
      // console.dir('FILE---------', file.file);
      $scope.$emit('$TRIGGERLOAD', 'mediaLoader', 'Adding Files');
      if (file._file && file._file.size && file._file.size >= 104857600) {
        triggerAlert('The file you have selected exceeds the file size limit of 100MB and will not be uploaded.', 'mediaLoader', 'body', 7000);
        this.removeFromQueue(file);
        $scope.$emit('$TRIGGERUNLOAD', 'mediaLoader', 6000);
        $scope.resetMediaInput();
        return;
      }
      
      if (this.queue.length >= this.queueLimit) {
        $scope.isFull = true;
      }
      if (file._file) {
        $scope.lastMediaFile = file._file.name;
      } else if (file.file) {
        $scope.lastMediaFile = file.file.name;
      }
      $scope.addMedia(file, $scope.queue, 'mediaForm', 'mediaLoader', 'caption', /*'securityMarkingType', */'mediaTypeCode');
      file.componentId = $scope.componentId;
      file.mediaTypeCode = $scope.mediaForm.mediaTypeCode;
      file.caption = $scope.mediaForm.caption || '';
      // file.securityMarkingType = $scope.mediaForm.securityMarkingType || '';
      file.componentMediaId = $scope.mediaForm.componentMediaId;
      $scope.resetMediaInput();
    },
    onBeforeUploadItem: function(item) {
      item.formData.push({
        "componentMedia.componentId" : item.componentId
      });
      item.formData.push({
        "componentMedia.mediaTypeCode" : item.mediaTypeCode
      });
      // item.formData.push({
      //   "componentMedia.securityMarkingType" : item.securityMarkingType
      // }); 
if (item.caption) {
        // console.log('we happened to hit this');
        
        item.formData.push({
          "componentMedia.caption": item.caption
        });
      }
      if (item.componentMediaId) {
        // console.log('we happened to hit this');
        item.formData.push({
          "componentMedia.componentMediaId": item.componentMediaId
        });
      }
      $timeout(function(){
        delete item.componentId
        delete item.mediaTypeCode
        delete item.caption
        delete item.componentMediaId
      })
    },
    onSuccessItem: function (item, response, status, headers) {
      $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 80000);

      //check response for a fail ticket or a error model
      if (response.success) {
        triggerAlert('Uploaded successfully', 'saveResource', 'componentWindowDiv', 3000);          
      } else {
        if (response.errors) {
          var uploadError = response.errors.file;
          var enityError = response.errors.componentMedia;
          var errorMessage = uploadError !== undefined ? uploadError : '  ' + enityError !== undefined ? enityError : '';
          triggerAlert('Unable to upload media. Message: <br> ' + errorMessage, 'saveMedia', 'componentWindowDiv', 6000);
        } else {
          triggerAlert('Unable to upload media. ', 'saveMedia', 'componentWindowDiv', 6000);
        }
      }
    },
    onErrorItem: function (item, response, status, headers) {
      $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 80000);
      triggerAlert('Unable to upload media. Failure communicating with server. ', 'saveMedia', 'componentWindowDiv', 6000);        
    },
    onCompleteAll: function(){
      $scope.getSubmission();
      $scope.mediaUploader.queue = [];
      $scope.queue = [];
    }
  });     



  $scope.removeFromResourceQueue = function(file){ //
    if (!($scope.component.component.approvalState && $scope.component.component.approvalState !== 'N')) {

      // console.log('MediaUploader', $scope.resourceUploader);
      // console.log('file', file);
      // console.log('Queue', $scope.resourceUploader.queue);

      var found = _.find($scope.resourceUploader.queue, file.file);
      if (found){
        // console.log('found', found);
        found = _.indexOf($scope.resourceUploader.queue, found);
        $scope.resourceUploader.queue.splice(found, 1);
        // console.log('resourceUploader', $scope.resourceUploader);
      }
      found = _.find($scope.resourceQueue, file);
      if (found){
        // console.log('found', found);
        found = _.indexOf($scope.resourceQueue, found);
        $scope.resourceQueue.splice(found, 1);
        // console.log('QUEUE', $scope.resourceQueue);
      }
    }
  }

  $scope.deleteResource = function(resource){//
    if (!($scope.component.component.approvalState && $scope.component.component.approvalState !== 'N')) {
      if (resource.resourceId) {
        $scope.hardDeleteEntity({
          loader: 'submissionLoader',
          entityName: 'Resource',
          entityPath: 'resources',
          entityId: resource.resourceId,
          loadEntity: function(){
            $scope.getSubmission();
          }        
        }); 
      } else {
        var found = _.find($scope.component.resources, resource);
        if (found){
          // console.log('found', found);
          found = _.indexOf($scope.component.resources, found);
          $scope.component.resources.splice(found, 1);
          // console.log('MediaUploader', $scope.component.resources);
        }
      }
    };
  };

  // Resource uploader
  $scope.resourceUploader = new FileUploader({//
    url: 'Resource.action?UploadResource',
    alias: 'file',
    queueLimit: 50,  
    removeAfterUpload: true,
    onAfterAddingFile: function(file){
      // console.log('We loaded the loader!', file.file);
      // console.dir(file.file);
      $scope.$emit('$TRIGGERLOAD', 'submissionLoader','Adding Files');
      if (file._file && file._file.size && file._file.size >= 104857600) {
        triggerAlert('The file you have selected exceeds the file size limit of 100MB and will not be uploaded.', 'mediaLoader', 'body', 7000);
        this.removeFromQueue(file);
        $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 6000);
        $scope.resetResourceInput();
        return;
      }
      if (this.queue.length >= this.queueLimit) {
        $scope.isFull = true;
      }
      if (file._file) {
        $scope.lastResourceFile = file._file.name;
      } else if (file.file) {
        $scope.lastResourceFile = file.file.name;
      }
      $scope.addMedia(file, $scope.resourceQueue, 'resourceForm', 'submissionLoader', 'description', /*'securityMarkingType', */'resourceType');
      file.componentId = $scope.componentId;
      file.resourceType = $scope.resourceForm.resourceType;
      file.description = $scope.resourceForm.description || '';
      // file.securityMarkingType = $scope.resourceForm.securityMarkingType || '';
      file.resourceId = $scope.resourceForm.resourceId;
      $scope.resetResourceInput();
    },
    onBeforeUploadItem: function(item) {
      item.formData.push({
        "componentResource.componentId" : item.componentId
      });
      item.formData.push({
        "componentResource.resourceType" : item.resourceType
      });
      item.formData.push({
        "componentResource.description" : item.description
      });
      item.formData.push({
        "componentResource.restricted" : item.restricted
      }); 
      // item.formData.push({
      //   "componentResource.securityMarkingType" : item.securityMarkingType
      // });       
if (item.resourceId) {
  item.formData.push({
    "componentResource.resourceId" : item.resourceId
  });
}
},
onSuccessItem: function (item, response, status, headers) {
  $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 100000);

      //check response for a fail ticket or a error model
      if (response.success) {
        triggerAlert('Uploaded successfully', 'saveResource', 'componentWindowDiv', 3000); 
        $scope.getSubmission();
      } else {
        if (response.errors) {
          var uploadError = response.errors.file;
          var enityError = response.errors.componentResource;
          var errorMessage = uploadError !== undefined ? uploadError : '  ' + enityError !== undefined ? enityError : '';
          triggerAlert('Unable to upload resource. Message: <br> ' + errorMessage, 'saveResource', 'componentWindowDiv', 6000);
        } else {
          triggerAlert('Unable to upload resource. ', 'saveResource', 'componentWindowDiv', 6000);
        }
      }
    },
    onErrorItem: function (item, response, status, headers) {
      $scope.$emit('$TRIGGERUNLOAD', 'submissionLoader', 100000);
      triggerAlert('Unable to upload resource. Failure communicating with server. ', 'saveResource', 'componentWindowDiv', 6000);      
    },
    onCompleteAll: function(){
      $scope.getSubmission();
      $scope.resourceUploader.queue = [];
      $scope.resourceQueue = [];
    }
  });

  $scope.scrollTo = function(id, current, parent, $event, focusId) {//
    var offset = 120;
    if($event) {
      $event.preventDefault();
      $event.stopPropagation();
    }
    $('li a:focus').blur();
    // console.log('current', current);
    
    $scope.current = current;
    $timeout(function(){
      $('[data-spy="scroll"]').each(function () {
        var $spy = $(this).scrollspy('refresh')
      })

      $timeout(function(){
        if ($location.hash() !== id) {
          // set the $location.hash to `newHash` and
          // $anchorScroll will automatically scroll to it
          $location.hash(id);
        } else {
          // call $anchorScroll() explicitly,
          // since $location.hash hasn't changed
          $anchorScroll();
        }
        $timeout(function(){
          $scope.resetToggles();
          
          var topScroll = $(document).height() - ($(window).scrollTop() + $(window).height()) ;
          var returnScroll = ($(window).scrollTop() - $('#'+id).offset().top);
          if (topScroll === 0 && returnScroll < 0 ) {
            returnScroll = offset - (returnScroll  * -1);
          } else {
            returnScroll = offset
          }
          window.scrollBy(0, -returnScroll);
          if (focusId) {
            $('#'+focusId).focus();
          }
        })
        $timeout(function(){
          $scope.resetToggles();
          $('li.active').removeClass('active');
          if (parent) {
            $('[data-target="#'+parent+'"]').addClass('active');
          }
          $('[data-target="#'+id+'"]').addClass('active');
        },100)
      })
    }) //
  };//


  $timeout(function(){
    if(!$rootScope.$$phase) {
      $scope.$apply(function(){
        $('body').scrollspy({ target: '#scrollSpy', offset: 100 });
        $scope.scrollTo('top', 'top');
      })
    }
  })

  $scope.resetToggles = function(){
    $timeout(function() {
      $('[data-toggle=\'tooltip\']').tooltip();
    }, 300);
  }
  $scope.resetToggles();


}])
.filter('makeattribute', function() {
  return function(input, attribute) {
    _.each(input, function(code){
      if (code) {
        code.requiredFlg = attribute.requiredFlg || false;
        code.requiredRestrictions = attribute.requiredRestrictions || false;
        code.hideOnSubmission = attribute.hideOnSubmission || false;
        code.attributeType = attribute.attributeType;
      }
    })
    return input;
  };
})
.filter('shownattribute', function() {
  return function(input) {
    var result = [];
    _.each(input, function(attribute){
      if (attribute && !attribute.hideOnSubmission) {
        result.push(attribute)
      }
    })
    return result;
  };
})
.filter('contactsfilter', function() {
  return function(input, key) {
    if (!input || !input.length || !key) {
      return input;
    }
    return _.reject(input, function(n){
      return n[key] === 'SUB';
    });
  };
})
.controller('AttrsInfoCtrl', ['$scope', '$uiModalInstance', 'size', 'attribute', 'notificationsFactory', '$timeout', function ($scope, $uiModalInstance, size, attribute, Factory, $timeout) {
  $scope.attribute = angular.copy(attribute);
  $scope.title = attribute.description;

  $scope.getDescription = function(code) {
    return code.description? '<p>'+code.description+'</p>': '<p style="font-style: italic;">There is no detailed description for this code.</p>';
  }

  $scope.ok = function (validity) {
    $uiModalInstance.close('success');
  }

  $scope.cancel = function () {
    $uiModalInstance.dismiss('cancel');
  };
}])
.controller('myCtrl', function($scope) {
  $scope.options = [{
    'label': 'test 1',
    'code': 'CODE1'
  }, {
    'label': 'test 2',
    'code': 'CODE2'
  }]
})
.directive('masked', ['$timeout', function ($timeout) {
  return {
    restrict: 'A',
    link: function postLink(scope, element, attrs) { /*jshint unused:false*/
      scope[attrs['masked']]        = scope[attrs['masked']] || {};
      scope[attrs['masked']].elips  = 0;
      scope[attrs['masked']].total  = 0;
      scope[attrs['masked']].msg    = 'Loading';

      scope.$watch(attrs['masked'], function(){

        if (scope[attrs['masked']].total && scope[attrs['masked']].total > 0 && scope[attrs['masked']].total < 2){
          scope[attrs['masked']].elips = 0;
          element.addClass('loaderMasked');
          $(window).on('scroll',windowScroll);
          clearInterval(timer);
          timer = setInterval(function (counter) {
            scope.$apply(function(){
              resetMsgPosition(false);
            });
          }, 500);
        } else if (!scope[attrs['masked']].total) {
          $(window).off('scroll',windowScroll);
          $('#'+attrs['masked']+'_msg').remove();
          element.removeClass('loaderMasked');
          clearInterval(timer);
        }
      }, true);

      var timer;
      var getElipses = function (scrolled) {
        switch (scope[attrs['masked']].elips) {
          case 0:
          if (!scrolled){
            scope[attrs['masked']].elips++;
          }
          return scope[attrs['masked']].msg + '...';
          break;
          case 1:
          if (!scrolled){
            scope[attrs['masked']].elips++;
          }
          return scope[attrs['masked']].msg + '...';
          break;
          case 2:
          if (!scrolled){
            scope[attrs['masked']].elips = 0;
          }
          return scope[attrs['masked']].msg + '...';
          break;
        }
      }
      var resetMsgPosition = function(scrolled){
        var scrollTop     = $(window).scrollTop(),
        elementOffset     = element.offset().top,
        distance          = (elementOffset - scrollTop),
        newHeight         = (element.height()/2) + 'px';
        if (element.height() > $(window).height() || distance < 0){
          if ((element.height() - (scrollTop - elementOffset)) > $(window).height()) {
            newHeight     = ((scrollTop - elementOffset) + ($(window).height()/2)) + 'px'; 
          } else {
            newHeight     = ((scrollTop - elementOffset) + ((element.height() - (scrollTop - elementOffset))/2)) + 'px'; 
          }
        }
        $('#'+attrs['masked']+'_msg').remove();
        element.append('<div style="text-align: center; font-size: 20px; width: 100%; position: absolute; top:'+newHeight+'; z-index:2; color:#FFF " id="'+attrs['masked']+'_msg">'+getElipses(scrolled)+'</div>');
      }
      var windowScroll = function() {
        scope.$apply(function(){
          resetMsgPosition(true)
        })
      };
      scope.$on('$LOADMASK', function (event, value, msg) {
        if (value === attrs['masked']) {
          if (!msg) {
            msg = 'Loading';
          }
          scope[attrs['masked']].msg = msg;
          scope[attrs['masked']].total++;
        }
      });
      scope.$on('$UNLOADMASK', function (event, value, time) {
        if (value === attrs['masked']) {
          scope[attrs['masked']].total = scope[attrs['masked']].total - 1 < 0? 0 : scope[attrs['masked']].total - 1;
        }
      });
    }
  };
}])
.directive('multiselect', ['$templateCache', '$timeout', function($templateCache, $timeout) {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      isDisabled: '=',
      selected: '=',
      list: '=',
      options: '@',
      onChange: '&'
    },
    template: $templateCache.get('multiselect/select.tmp.html'),
    link: function(scope, elem, attrs) {

      (scope.selected && _.isArray(scope.selected.items))? null: _.isObject(scope.selected)? scope.selected.items = []: scope.selected = {items:[]};
      scope.addToSelection = function(selection){
        if (!scope.isDisabled) {
          _.contains(scope.selected.items, selection) || !selection? null:scope.selected.items.push(selection);
          scope.onChange(true);
        }
      }
      scope.removeItem = function(item){
        if (!scope.isDisabled) {
          var index = _.find(scope.selected.items, {label: item.label});
          if (index) {
            index = _.indexOf(scope.selected.items, index);
            scope.selected.items.splice(index, 1);
          }
          if (scope.selected.items.length === 0){
            var elements = elem.find('select')[0].options;

            for(var i = 0; i < elements.length; i++){
              elements[i].selected = false;
            }
          }
        }
      }
    }
  };
}])
.directive("select", function() {
  // This is a quick fix for the 'second' key change if using the keyboard for 
  // the select change.
  return {
    restrict: "E",
    require: "?ngModel",
    scope: false,
    link: function (scope, element, attrs, ngModel) {
      if (!ngModel) {
        return;
      }
      element.bind("keyup", function() {
        element.triggerHandler("change");
      })
    }
  }
});