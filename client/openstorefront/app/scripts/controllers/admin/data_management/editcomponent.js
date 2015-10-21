'use strict';

/*global triggerError, removeError, isEmpty*/

app.controller('AdminEditcomponentCtrl', ['$scope', 'business', '$timeout', '$uiModal', 'FileUploader', 
  function ($scope, Business, $timeout, $uiModal, FileUploader) {

    $scope.predicate = [];
    $scope.predicate['components'] = 'name';
    $scope.predicate['eval'] = 'sortOrder';
    $scope.reverse = [];
    $scope.statusFilterOptions = [
    {code: 'A', desc: 'Active'},
    {code: 'I', desc: 'Inactive'}
    ];
    $scope.queryFilter = angular.copy(utils.queryFilter);    
    $scope.queryFilter.max = 500;
    $scope.queryFilter.sortField = 'name'; 
    $scope.components = [];
    $scope.filteredComponents = [];
    $scope.allComponentsWatch = {};
    $scope.allComponentsWatch.data = [];
    $scope.flags = {};
    $scope.flags.showUpload = false;
    $scope.componentUploadOptions = {};
    $scope.selectedComponents = [];
    $scope.selectAllComps = {};
    $scope.selectAllComps.flag = false;
    $scope.submitter = null;
    $scope.pagination = {};
    $scope.pagination.control = {};
    $scope.pagination.control.approvalState ='ALL';
    $scope.pagination.control.componentType ='ALL';
    $scope.pagination.features = {'dates': false, 'max': false};    

    $scope.$watch('allComponentsWatch', function(){
      if ($scope.allComponentsWatch.data){
        $scope.filteredComponents = $scope.allComponentsWatch.data.components || [];
      }
    }, true);



    $scope.loadLookup = function(lookup, entity, loader){
      $scope.$emit('$TRIGGERLOAD', loader);

      Business.lookupservice.getLookupCodes(lookup, 'A').then(function (results) {
        $scope.$emit('$TRIGGERUNLOAD', loader);
        if (results) {
          $scope[entity]= results;
        }        
      });      
    };
    $scope.loadLookup('SecurityMarkingType', 'securityTypes', 'generalFormLoader'); 

    $scope.getSecurityDesc = function(type){
      var found = _.find($scope.securityTypes, {'code': type});
      return found? found.description : type; 
    }



    $scope.setPredicate = function (predicate, table) {
      if ($scope.predicate[table] === predicate) {
        $scope.reverse[table] = !$scope.reverse[table];
      } else {
        $scope.predicate[table] = predicate;
        $scope.reverse[table] = false;
      }
      if (table === 'components') {
        $scope.pagination.control.changeSortOrder(predicate);
      }
    };

    $scope.pagination.control.setPredicate = function(val){
      $scope.setPredicate(val, 'components');
    };

    if ($scope.pagination.control) {
      $scope.pagination.control.onRefresh = function(){
        $scope.selectedComponents = [];
        $scope.$emit('$TRIGGERUNLOAD', 'componentLoader');
      }
    }

    $scope.refreshComponents = function () {
      if ($scope.pagination.control && $scope.pagination.control.refresh) {
        $scope.$emit('$TRIGGERLOAD', 'componentLoader');
        $scope.pagination.control.refresh().then(function(){
          $scope.selectedComponents = [];
          $scope.$emit('$TRIGGERUNLOAD', 'componentLoader');
        });
      }
    };
    $scope.$on('$REFRESH_COMPONENTS', function(){       
      $scope.refreshComponents();
    });     

    $scope.editComponent = function(component){
      var modalInstance = $uiModal.open({
        templateUrl: 'views/admin/component/editComponent.html',
        controller: 'AdminComponentEditCtrl',
        backdrop: 'static',
        size: 'lg',
        resolve: {
          component: function () {
            return component;
          },
          editMode: function(){
            return true;
          },
          allComponents: function(){
            return $scope.filteredComponents;
          }
        }
      });     
    };
    
    $scope.addComponent = function(){
      var modalInstance = $uiModal.open({
        templateUrl: 'views/admin/component/editComponent.html',
        controller: 'AdminComponentEditCtrl',
        backdrop: 'static',
        size: 'lg',
        resolve: {
          component: function () {
            return {};
          },
          editMode: function(){
            return false;
          },
          allComponents: function(){
            return $scope.filteredComponents;
          }
        }
      });       
    };
    
    $scope.toggleStatus = function(component){
      var mode = 'INACTIVATE';
      if (component.component.activeStatus !== 'A') {
        mode = 'ACTIVATE';
      }

      var response = window.confirm("Are you sure you want  " + mode + " " + component.component.name + "?");
      if (response) {
        $scope.$emit('$TRIGGERLOAD', 'componentLoader');
        if (component.component.activeStatus === 'A') {
          Business.componentservice.inactivateComponent(component.component.componentId).then(function (results) {
            $scope.refreshComponents();
            $scope.$emit('$TRIGGERUNLOAD', 'componentLoader');
          });
        } else {
          Business.componentservice.activateComponent(component.component.componentId).then(function (results) {
            $scope.refreshComponents();
            $scope.$emit('$TRIGGERUNLOAD', 'componentLoader');
          });
        }
      }
    };
    
    $scope.exportComponent = function(componentId){
      window.location.href = "api/v1/resource/components/" + componentId + "/export";
    };    
    
    $scope.preview = function(component) {
      utils.openWindow('single?id='+ component.component.componentId, 'Component Preview', "resizable=yes,scrollbars=yes,height=650,width=1000");
    };    
    
    $scope.deleteComponent = function(component){
      var response = window.confirm("Are you sure you want DELETE "+ component.name + "?");
      if (response) {
        $scope.$emit('$TRIGGERLOAD', 'componentLoader');
        Business.componentservice.deleteComponent(component.componentId).then(function (result) {          
          $scope.$emit('$TRIGGERUNLOAD', 'componentLoader');
          $scope.refreshComponents();
        });
      }
    }; 

    $scope.selectComponent = function(component){
      if (component.selected) {
        component.selected = !component.selected;
        if (component.selected === false) {
         $scope.selectedComponents = _.reject($scope.selectedComponents, function(id) { return id === component.component.componentId; });
       } else {
        $scope.selectedComponents.push(component.component.componentId);
      }
    } else {
      component.selected = true;
      $scope.selectedComponents.push(component.component.componentId);
    }
  };

  $scope.selectAllComponents = function(){
    $scope.selectedComponents = [];
    _.forEach($scope.filteredComponents, function(component){                
        component.selected = !$scope.selectAllComps.flag; //click happens before state change
        if (component.selected) {
          $scope.selectedComponents.push(component.component.componentId);
        }
      });
  };

  $scope.exportAll = function(){
    //$scope.exportForm.submit();
    document.exportForm.submit();
    // window.location.href = "api/v1/resource/components/export";
  };

  $scope.componentUploader = new FileUploader({
    url: 'Upload.action?UploadComponent',
    alias: 'uploadFile',
    queueLimit: 1,  
    removeAfterUpload: true,
    onBeforeUploadItem: function(item) {
      $scope.$emit('$TRIGGERLOAD', 'componentLoader');

      item.formData.push({
        "componentUploadOptions.uploadReviews" : $scope.componentUploadOptions.uploadReviews
      });
      item.formData.push({
        "componentUploadOptions.uploadQuestions" : $scope.componentUploadOptions.uploadQuestions
      });
      item.formData.push({
        "componentUploadOptions.uploadTags" : $scope.componentUploadOptions.uploadTags
      });
      item.formData.push({
        "componentUploadOptions.uploadIntegration" : $scope.componentUploadOptions.uploadIntegration
      });      
    },
    onSuccessItem: function (item, response, status, headers) {
      $scope.$emit('$TRIGGERUNLOAD', 'componentLoader');

      //check response for a fail ticket or a error model
      if (response.success) {
        triggerAlert('Uploaded successfully.  Processing components; watch tasks for completion.', 'importComponents', 'componentWindowDiv', 3000); 
        $scope.flags.showUpload = false;
      } else {
        if (response.errors) {
          var uploadError = response.errors.uploadFile;            
          var errorMessage = uploadError !== undefined ? uploadError : '  ';
          triggerAlert('Unable to upload component(s). Message: <br> ' + errorMessage, 'importComponents', 'componentWindowDiv', 6000);
        } else {
          triggerAlert('Unable to upload component(s). ', 'importComponents', 'componentWindowDiv', 6000);
        }
      }
    },
    onErrorItem: function (item, response, status, headers) {
      $scope.$emit('$TRIGGERUNLOAD', 'resourceFormLoader');
      triggerAlert('Unable to upload component(s). Failure communicating with server. ', 'importComponents', 'componentWindowDiv', 6000);      
    }      
  });

    /*{
      fixedOffset: $('#header') // how far from the top the table should fix to.,
      scrollableArea: $('#header') //which surrounding element is scrolling.
    }*/
    // to resize manually -- $(window).trigger('resize.stickyTableHeaders');

    var stickThatTable = function(){
      var offset = $('.top').outerHeight() + $('#editComponentToolbar').outerHeight();
      $(".stickytable").stickyTableHeaders({
        fixedOffset: offset
      });
    }

    $(window).resize(stickThatTable);
    $timeout(stickThatTable, 100);

  }]);

app.controller('AdminComponentEditCtrl', ['$scope', '$q', '$filter', '$uiModalInstance', 'component', 'editMode', 'allComponents', 'business', '$uiModal', '$draggable', 'FileUploader', '$rootScope', '$timeout',
  function ($scope, $q, $filter, $uiModalInstance, component, editMode, allComponents, Business, $uiModal, $draggable, FileUploader, $rootScope, $timeout) {

    $scope.editMode = editMode;
    $scope.allComponents = allComponents;
    $scope.editModeText = $scope.editMode ? 'Edit ' + component.component.name : 'Add Component';
    $scope.componentForm = component.component !== undefined ? angular.copy(component.component) : {};
    $scope.editorOptions = getCkBasicConfig(false);
    $scope.integration = {};
    $scope.sendAdminMessage   = $rootScope.openAdminMessage;

    $scope.business = Business;

    $scope.statusFilterOptions = [
    {code: 'A', desc: 'Active'},
    {code: 'I', desc: 'Inactive'}
    ];
    
    $scope.predicate = [];
    $scope.reverse = [];      
    
    $scope.setupModal = function(componentId, enabled) {
      var deferred = $q.defer();
      var modalInstance = $uiModal.open({
        templateUrl: 'views/admin/configuration/savecompconf.html',
        controller: 'SavecompconfCtrl',
        size: 'lg',
        backdrop: 'static',
        resolve: {
          componentId: function(){
            return componentId;
          },
          enabled: function() {
            return enabled;
          },   
          size: function() {
            return 'lg';
          }
        }
      });

      modalInstance.result.then(function (result) {        
      }, function (result) {
        $scope.$emit('$TRIGGERLOAD', 'generalFormLoader');
        Business.componentservice.getComponent(componentId).then(function(results){
         $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'generalFormLoader');
         $scope.componentForm = results.component;
         $scope.integration.integrationText = results.integrationManagement;
         if (results.integrationManagement){
           $scope.flags.showIntegrationBanner = true;      
         }  else {
           $scope.flags.showIntegrationBanner = false;
         }            
       }, function(results){
         $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'generalFormLoader');
       });
      });
      deferred.resolve();
      return deferred.promise;
    };    

    $scope.getRelationship = function(type){
      var found = _.find($scope.relationshipTypes, {'code': type});
      if (found){
        return found.description;
      }
      return '(Relationship not found)';
    }

    $scope.getComponentName = function(id){
      var components = _.pluck($scope.allComponents, 'component');
      var found = _.find(components, {'componentId': id});
      if (found){
        return found.name;
      }
      return '(Component not found)';
    }

    $scope.sendToSubmitter = function() {
      var temp = [];
      var templates = {
        types: [{
          title: 'Please add to these sections'
        },{
          title: 'Please review these sections'
        },{
          title: 'Please remove items from these sections'
        }],
        templates: [{
          title: 'Description'
        }, {
          title: 'Attributes'
        }, {
          title: 'Contacts'
        }, {
          title: 'Resources'
        }, {
          title: 'Media'
        }, {
          title: 'Dependencies'
        }, {
          title: 'Tags'
        }
        ]
      }

      temp.push($scope.submitter);
      if (temp && temp.length) {
        // console.log('component', component);
        
        $scope.sendAdminMessage('users', temp, 'Please Review Your Submission "'+ component.component.name +'"', templates, true);
      } else {
        triggerAlert('You are unable to send a message to this user. (They could be deactivated or without an email address)', 'failedMessage', 'body', '8000')
      }
    }

    var basicForm = {
      saveText: 'Add',
      edit: false
    };

    var basicFilter = {
      status: $scope.statusFilterOptions[0]
    };    

    $scope.generalForm = {};   
    $scope.generalForm.requiredAttribute = {};
    $scope.flags = {};
    if (component.integrationManagement){
      $scope.flags.showIntegrationBanner = true;
      $scope.integration.integrationText = component.integrationManagement;
    }
    $scope.componentAttributeQueryFilter = angular.copy(utils.queryFilter);      


    $scope.attributeForm = angular.copy(basicForm);
    $scope.componentAttributeViewQueryFilter = angular.copy(utils.queryFilter);      
    $scope.componentAttributeViewQueryFilter.status = $scope.statusFilterOptions[0].code;

    $scope.relationshipForm = angular.copy(basicForm);
    $scope.componentRelationshipViewQueryFilter = angular.copy(utils.queryFilter);      
    $scope.componentRelationshipViewQueryFilter.status = $scope.statusFilterOptions[0].code;

    $scope.contactForm = angular.copy(basicForm);
    $scope.contactQueryFilter = angular.copy(utils.queryFilter);   
    $scope.contactQueryFilter.status = $scope.statusFilterOptions[0].code;

    $scope.resourceForm = angular.copy(basicForm);
    $scope.resourceQueryFilter = angular.copy(utils.queryFilter);   
    $scope.resourceQueryFilter.status = $scope.statusFilterOptions[0].code;

    $scope.mediaForm = angular.copy(basicForm);
    $scope.mediaQueryFilter = angular.copy(utils.queryFilter);   
    $scope.mediaQueryFilter.status = $scope.statusFilterOptions[0].code;    

    $scope.dependencyForm = angular.copy(basicForm);
    $scope.dependencyFilter = angular.copy(utils.queryFilter);   
    $scope.dependencyFilter.status = $scope.statusFilterOptions[0].code;      

    $scope.metadataForm = angular.copy(basicForm);
    $scope.metadataFilter = angular.copy(utils.queryFilter);   
    $scope.metadataFilter.status = $scope.statusFilterOptions[0].code;    

    $scope.evaluationForm = {};

    $scope.tagForm = angular.copy(basicForm);
    $scope.tagFilter = angular.copy(utils.queryFilter);   
    $scope.tagFilter.status = $scope.statusFilterOptions[0].code;        

    $scope.reviewFilter = angular.copy(utils.queryFilter);   
    $scope.reviewFilter.status = $scope.statusFilterOptions[0].code;     

    $scope.questionFilter = angular.copy(utils.queryFilter);   
    $scope.questionFilter.status = $scope.statusFilterOptions[0].code;      
    $scope.questionDetailsShow = [];

    $scope.EMAIL_REGEXP = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9-]+(\.[a-z0-9-]+)*$/i;

    $scope.setPredicate = function (predicate, table) {
      if ($scope.predicate[table] === predicate) {
        $scope.reverse[table] = !$scope.reverse[table];
      } else {
        $scope.predicate[table] = predicate;
        $scope.reverse[table] = false;
      }
    };

//<editor-fold   desc="COMMON Section">    

$scope.loadLookup = function(lookup, entity, loader){
  $scope.$emit('$TRIGGERLOAD', loader);

  Business.lookupservice.getLookupCodes(lookup, 'A').then(function (results) {
    $scope.$emit('$TRIGGERUNLOAD', loader);
    if (results) {
      $scope[entity]= results;
    }        
  });      
};

$scope.loadEntity = function(entityOptions){
  if ($scope.componentForm.componentId) {
    $scope.$emit('$TRIGGERLOAD', entityOptions.loader);        
    Business.componentservice.getComponentSubEntity({
      componentId: $scope.componentForm.componentId,
      entity: entityOptions.entity,
      queryParamFilter: entityOptions.filter
    }).then(function (results) {
      $scope.$emit('$TRIGGERUNLOAD', entityOptions.loader);
      if (results) {
        $scope[entityOptions.entity] = results;
        if (entityOptions.callback){
          entityOptions.callback(results);
        }
      }
    });
  }
};

$scope.toggleEntityStatus = function(entityOptions){
  $scope.$emit('$TRIGGERLOAD', entityOptions.loader);
  if(entityOptions.entity.activeStatus === 'A') {
    Business.componentservice.inactivateEnity({
      componentId: $scope.componentForm.componentId,
      entityId: entityOptions.entityId,
      entity: entityOptions.entityName
    }).then(function (results) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', entityOptions.loader);
      entityOptions.loadEntity();             
    });        
  } else {
    Business.componentservice.activateEntity({
      componentId: $scope.componentForm.componentId,
      entityId: entityOptions.entityId,
      entity: entityOptions.entityName
    }).then(function (results) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', entityOptions.loader);
      entityOptions.loadEntity();  
    });        
  }
};    

$scope.editEntity = function(form, entity){
  $scope[form] = angular.copy(entity);     
  $scope[form].saveText = "Update";
  $scope[form].edit = true; 
  $scope[form].collapse = false;          
};

$scope.cancelEdit = function(form){
  $scope[form] = {};
  $scope[form].saveText = "Add";
  $scope[form].edit = false;       
};

$scope.saveEntity = function(options){
  $scope.$emit('$TRIGGERLOAD', options.loader);

  if ($scope[options.formName].edit){
    delete options.entity.type;
    Business.componentservice.updateSubComponentEntity({
      componentId: $scope.componentForm.componentId,
      entityName: options.entityName,
      entity: options.entity,
      entityId: options.entityId
    }).then(function (result) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', options.loader);
      if (result) {
        if (result && result !== 'false' && isNotRequestError(result)){      
          removeError();
          triggerAlert('Saved successfully', options.alertId, options.alertDiv, 3000);
          $scope.cancelEdit(options.formName);
          options.loadEntity();                
        } else {
          removeError();
          triggerError(result, true);
        }
      }
    });         
  } else {
    Business.componentservice.addSubComponentEntity({
      componentId: $scope.componentForm.componentId,
      entityName: options.entityName,
      entity: options.entity
    }).then(function (result) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', options.loader);
      if (result) {
        if (result && result !== 'false' && isNotRequestError(result)){  
          removeError();
          triggerAlert('Saved successfully', options.alertId, options.alertDiv, 3000);
          $scope.cancelEdit(options.formName);
          options.loadEntity(); 
        } else {
          removeError();
          triggerError(result, true);
        }
      }
    });       
  }      
};   

$scope.hardDeleteEntity = function(options){
  var response = window.confirm("Are you sure you want to DELETE "+ options.entityName + "?");
  if (response) {
    $scope.$emit('$TRIGGERLOAD', options.loader);
    Business.componentservice.forceRemoveEnity({
      componentId: $scope.componentForm.componentId,
      entity: options.entityPath,
      entityId: options.entityId
    }).then(function (result) {          
      $scope.$emit('$TRIGGERUNLOAD', options.loader);
      options.loadEntity();
    });
  }
};

//</editor-fold>          

//<editor-fold   desc="General Section">
$scope.loadComponentList = function(){
  Business.componentservice.getComponentLookupList().then(function (results) {
    if (results) {          
      $scope.parentComponents = results;                    
      $scope.parentComponents.push({
        code: '',
        description: '  '
      });
      $scope.generalForm.parentComp = _.find($scope.parentComponents, {code: $scope.componentForm.parentComponentId});          
    }
  });      
};


$scope.loadApprovalStatus  = function(){
  Business.componentservice.getComponentApproveStatus().then(function (results) {
    if (results) {
      $scope.approvalStatuses = results;
    }
  });      
};

$scope.getAttributes = function (override) { 
  Business.getFilters(override, false).then(function (result) {
    $scope.allAttributes = result ? angular.copy(result) : [];
    $scope.requiredAttributes = _.filter($scope.allAttributes, {requiredFlg: true});
  });
};    

$scope.loadComponentAttributes = function(){
  if ($scope.componentForm.componentId) {
    $scope.componentAttributeQueryFilter.status = 'A';    
    Business.componentservice.getComponentAttributes($scope.componentForm.componentId, $scope.componentAttributeQueryFilter).then(function (results) {
      if (results) {
        $scope.activeComponentAttributes = results;                    
        _.forEach($scope.activeComponentAttributes, function (item) {
          $scope.generalForm.requiredAttribute[item.componentAttributePk.attributeType] = item.componentAttributePk.attributeCode;
        });            
      }
    });
  }
};

$scope.loadAllComponentForms = function(){
  $scope.$emit('$TRIGGERLOAD', 'generalFormLoader');

  var deferred = $q.defer();
  deferred.promise.then(function(){
    $scope.loadComponentList();
  }).then(function(){
    $scope.loadApprovalStatus();  
  }).then(function(){
    $scope.getAttributes(true); 
  }).then(function(){
    $scope.loadComponentAttributes();
  }).then(function(){
    $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'generalFormLoader');
  });      
  deferred.resolve('Start');      
};
$scope.loadAllComponentForms();

$scope.getCodesForType = function(type){
  var foundType = _.find($scope.allAttributes, {attributeType: type});
  return foundType !== undefined ? foundType.codes : [];
};  

$scope.loadLookup('ComponentType', 'componentTypes', 'generalFormLoader'); 
$scope.loadLookup('SecurityMarkingType', 'securityTypes', 'generalFormLoader'); 
$scope.saveComponent = function(){
  $scope.$emit('$TRIGGERLOAD', 'generalFormLoader');

  var requiredForComponent = {
    component: $scope.componentForm,
    attributes: []
  };

  //default the type to Component
  if (requiredForComponent.component && !requiredForComponent.componentType) {
    requiredForComponent.component.componentType = requiredForComponent.component.componentType || 'COMP';
  }

  var missingRequiredAttributes = false;
  console.log('requiredForComponent.component.ComponentType', requiredForComponent.component.componentType);
  
  _.forEach($filter('requiredByComponentType')($scope.requiredAttributes, requiredForComponent.component.componentType , false), function(attribute) {

    var found = false;   
    _.forOwn($scope.generalForm.requiredAttribute, function (value, key) {
      if (attribute.attributeType === key) {
        found = true;
      }
    });      
    if (found === false) {
      missingRequiredAttributes = true;
    }    
  });  

  if (missingRequiredAttributes) {
    $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'generalFormLoader');
    triggerAlert('Missing Required Attributes.   Select all required attributes before saving.', 'saveGeneralComponent', 'componentWindowDiv', 3000);
    return;
  }  
  
  _.forOwn($scope.generalForm.requiredAttribute, function (value, key) {
    requiredForComponent.attributes.push({
      componentAttributePk: {
        attributeType: key,
        attributeCode: value
      }
    });
  });

  if (requiredForComponent.component.releaseDate){
    requiredForComponent.component.releaseDate = $filter('date')(requiredForComponent.component.releaseDate, "yyyy-MM-dd'T'HH:mm:ss.sss");
    //requiredForComponent.component.releaseDate = requiredForComponent.component.releaseDate.sub
  }

  if ($scope.editMode){
    Business.componentservice.updateComponent(requiredForComponent, $scope.componentForm.componentId).then(function (result) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'generalFormLoader');
      if (result) {
        if (result && result !== 'false' && isNotRequestError(result)){      
          removeError();
          triggerAlert('Saved successfully', 'saveGeneralComponent', 'componentWindowDiv', 3000);
          $scope.componentForm = result.component;
          $scope.$emit('$TRIGGEREVENT', '$REFRESH_COMPONENTS');  
        } else {
          removeError();
          triggerError(result, true);
        }
      }
    });         
  } else {
    console.log('requiredForComponent', requiredForComponent);

    Business.componentservice.addComponent(requiredForComponent).then(function (result) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'generalFormLoader');
      if (result) {
        if (result && result !== 'false' && isNotRequestError(result)){  
          removeError();
          triggerAlert('Saved successfully', 'saveGeneralComponent', 'componentWindowDiv', 3000);
          $scope.componentForm = result.component;
          $scope.editMode = true;
          $scope.editModeText = 'Edit ' + $scope.componentForm.name;
          $scope.loadEvaluationInfo();
          $scope.$emit('$TRIGGEREVENT', '$REFRESH_COMPONENTS');  
        } else {
          removeError();
          triggerError(result, true);
        }
      }
    });       
  } 

};



//</editor-fold>     

//<editor-fold   desc="ATTRIBUTE Section">

$scope.loadComponentAttributesView = function(){
  if ($scope.componentForm.componentId) {
    $scope.$emit('$TRIGGERLOAD', 'attributeFormLoader');     
    Business.componentservice.getComponentAttributeView($scope.componentForm.componentId, $scope.componentAttributeViewQueryFilter).then(function (results) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'attributeFormLoader');
      if (results) {
        $scope.componentAttributesView = results; 
        $scope.componentAttributesView = _.filter($scope.componentAttributesView, function(attributesView){
          return !attributesView.requiredFlg || (attributesView.requiredFlg && !!!_.find(attributesView.requiredRestrictions, {'componentType': $scope.componentForm.componentType}));
        });
      }
    });
  }
};    
$scope.loadComponentAttributesView();   


$scope.toggleAttributeStatus = function(attribute){
  $scope.$emit('$TRIGGERLOAD', 'attributeFormLoader');

  if(attribute.activeStatus === 'A') {
    Business.componentservice.inactivateAttribute($scope.componentForm.componentId, attribute.type, attribute.code).then(function (results) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'attributeFormLoader');
      $scope.loadComponentAttributesView();              
    });        
  } else {
    Business.componentservice.activateAttribute($scope.componentForm.componentId, attribute.type, attribute.code).then(function (results) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'attributeFormLoader');
      $scope.loadComponentAttributesView();    
    });        
  }
}; 

$scope.deleteAttribute = function(attribute) {
  var response = window.confirm("Are you sure you want to DELETE attribute "+ attribute.typeDescription + "?");
  if (response) {
    $scope.$emit('$TRIGGERLOAD', 'attributeFormLoader');
    Business.componentservice.deleteAttribute($scope.componentForm.componentId, attribute.type, attribute.code).then(function (results) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'attributeFormLoader');
      $scope.loadComponentAttributesView();              
    });    
  }  
};

$scope.saveAttribute = function(){
  $scope.$emit('$TRIGGERLOAD', 'attributeFormLoader');
  var componentAttribute = {
    componentAttributePk: {
      attributeType : $scope.attributeForm.type,
      attributeCode : $scope.attributeForm.code          
    }
  };
  Business.componentservice.saveAttribute($scope.componentForm.componentId, componentAttribute).then(function (result) {
    $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'attributeFormLoader');
    if (result){
      if (result && result !== 'false' && isNotRequestError(result)) {
        removeError();
        triggerAlert('Saved successfully', 'saveAttributes', 'componentWindowDiv', 3000);
        $scope.attributeForm.type = "";
        $scope.attributeForm.code = "";
        $scope.loadComponentAttributesView();
      } else {
        removeError();
        triggerError(result, true);
      }
    }        
  });       
};

//</editor-fold> 
//<editor-fold   desc="RELATIONSHIP Section">
$scope.loadLookup('RelationshipType', 'relationshipTypes', 'relationshipFormLoader');  

$scope.loadComponentRelationshipsView = function(){
  if ($scope.componentForm.componentId) {
    $scope.$emit('$TRIGGERLOAD', 'relationshipFormLoader');     
    Business.componentservice.getComponentRelationships($scope.componentForm.componentId, $scope.componentRelationshipViewQueryFilter).then(function (results) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'relationshipFormLoader');
      if (results) {
        $scope.componentRelationshipsView = results; 
      }
    });
  }
};    
$scope.loadComponentRelationshipsView();   

$scope.deleteRelationship = function(relationship) {
  var response = window.confirm("Are you sure you want to DELETE relationship &mdash; "+ relationship.ownerComponentName + ' ' + relationship.relationshipTypeDescription + ' ' + relationship.targetComponentName + "?");
  if (response) {
    $scope.$emit('$TRIGGERLOAD', 'relationshipFormLoader');
    Business.componentservice.deleteRelationship($scope.componentForm.componentId, relationship.relationshipId).then(function (results) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'relationshipFormLoader');
      $scope.loadComponentRelationshipsView();              
    });    
  }  
};

$scope.saveRelationship = function(){
  $scope.$emit('$TRIGGERLOAD', 'relationshipFormLoader');
  var componentRelationship = {
    relationshipType: $scope.relationshipForm.type,
    relatedComponentId: $scope.relationshipForm.target,
    // securityMarkingType: $scope.relationshipForm.securityMarkingType
  };
  Business.componentservice.saveRelationship($scope.componentForm.componentId, componentRelationship).then(function (result) {
    $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'relationshipFormLoader');
    if (result){
      if (result && result !== 'false' && isNotRequestError(result)) {
        removeError();
        triggerAlert('Saved successfully', 'saveRelationships', 'componentWindowDiv', 3000);
        $scope.relationshipForm.type = "";
        $scope.relationshipForm.target = "";
        $scope.relationshipForm.securityMarkingType = null;
        $scope.loadComponentRelationshipsView();
      } else {
        removeError();
        triggerError(result, true);
      }
    }        
  });       
};
//</editor-fold> 

//<editor-fold   desc="Contact Section">

$scope.loadLookup('ContactType', 'contactTypes', 'contactFormLoader');  

$scope.loadContacts = function() {
  $scope.loadEntity({
    filter: $scope.contactQueryFilter,
    entity: 'contacts',
    loader: 'contactFormLoader',
    callback: function(result){
      var found = _.find(result, {'contactType': 'SUB'});
      if (found){
        $scope.submitter = angular.copy(found);
      }
    }
  });
};
$scope.loadContacts();    

$scope.toggleContactStatus = function(contact){
  $scope.toggleEntityStatus({
    entity: contact,        
    entityId: contact.contactId,
    entityName: 'contacts',        
    loader: 'contactFormLoader',
    loadEntity: function(){
      $scope.loadContacts();
    }
  });
};    

$scope.saveContact = function () {
  delete $scope.contactForm.type;
  $scope.saveEntity({
    alertId: 'saveContact',
    alertDiv: 'contactManagementDivId',
    loader: 'contactFormLoader',
    entityName: 'contacts',
    entity: $scope.contactForm,
    entityId: $scope.contactForm.contactId,
    formName: 'contactForm',
    loadEntity: function () {
      $scope.loadContacts();
    }
  });       
};

//</editor-fold>  

//<editor-fold   desc="Resource Section">

$scope.loadLookup('ResourceType', 'resourceTypes', 'resourceFormLoader');  

$scope.loadResources = function() {
  $scope.loadEntity({
    filter: $scope.resourceQueryFilter,
    entity: 'resources',
    loader: 'resourceFormLoader'
  });
};
$scope.loadResources();

$scope.toggleResourceStatus = function(resource){
  $scope.toggleEntityStatus({
    entity: resource,        
    entityId: resource.resourceId,
    entityName: 'resources',        
    loader: 'resourceFormLoader',
    loadEntity: function(){
      $scope.loadResources();
    }
  });
};

$scope.deleteResource = function(resource){
 $scope.hardDeleteEntity({
  loader: 'resourceFormLoader',
  entityName: 'Resource',
  entityPath: 'resources',
  entityId: resource.resourceId,
  loadEntity: function(){
    $scope.loadResources();
  }        
}); 
};

$scope.saveResource = function () {
  $scope.resourceForm.link = $scope.resourceForm.originalLink;
  if ($scope.resourceForm.originalLink || 
    $scope.resourceUploader.queue.length === 0) {

    if (!$scope.resourceForm.originalLink) {
      $scope.resourceForm.fileName = $scope.resourceForm.localResourceName;    
      $scope.resourceForm.originalName = $scope.resourceForm.originalFileName;  
    } else {
      $scope.resourceForm.mimeType = '';
    }

    $scope.saveEntity({
      alertId: 'saveResource',
      alertDiv: 'componentWindowDiv',
      loader: 'resourceFormLoader',
      entityName: 'resources',
      entity: $scope.resourceForm,
      entityId: $scope.resourceForm.resourceId,
      formName: 'resourceForm',
      loadEntity: function () {
        $scope.loadResources();
      }
    });
  } else {      
    $scope.resourceUploader.uploadAll();   
  }
};   

$scope.cancelResourceEdit = function () {
  $scope.cancelEdit('resourceForm');      
};

$scope.resourceUploader = new FileUploader({
  url: 'Resource.action?UploadResource',
  alias: 'file',
  queueLimit: 1,  
  removeAfterUpload: true,
  onAfterAddingFile: function(file){
    if (file._file && file._file.size && file._file.size >= 104857600) {
      triggerAlert('The file you have selected exceeds the file size limit of 100MB and will not be uploaded.', 'mediaLoader', 'body', 7000);
      this.removeFromQueue(file);          
      $scope.cancelResourceEdit();
      return;
    }
  },
  onBeforeUploadItem: function(item) {
    $scope.$emit('$TRIGGERLOAD', 'resourceFormLoader');

    item.formData.push({
      "componentResource.componentId" : $scope.componentForm.componentId
    });
    item.formData.push({
      "componentResource.resourceType" : $scope.resourceForm.resourceType
    });
    item.formData.push({
      "componentResource.description" : $scope.resourceForm.description
    });
    item.formData.push({
      "componentResource.restricted" : $scope.resourceForm.restricted
    });
//    item.formData.push({
//      "componentResource.securityMarkingType" : $scope.resourceForm.securityMarkingType
//    });        
    if ($scope.resourceForm.resourceId) {
      item.formData.push({
        "componentResource.resourceId" : $scope.resourceForm.resourceId
      });
    }
  },
  onSuccessItem: function (item, response, status, headers) {
    $scope.$emit('$TRIGGERUNLOAD', 'resourceFormLoader');

        //check response for a fail ticket or a error model
        if (response.success) {
          triggerAlert('Uploaded successfully', 'saveResource', 'componentWindowDiv', 3000); 
          $scope.cancelResourceEdit();
          $scope.loadResources();
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
        $scope.$emit('$TRIGGERUNLOAD', 'resourceFormLoader');
        triggerAlert('Unable to upload resource. Failure communicating with server. ', 'saveResource', 'componentWindowDiv', 6000);              
      },
      onCompleteAll: function(){        
        document.resourceUIForm.uploadFile.value = null;
        $scope.resourceUploader.queue = [];      
      }     
    });     


//</editor-fold> 

//<editor-fold   desc="Media Section">

$scope.loadLookup('MediaType', 'mediaTypes', 'mediaFormLoader');

$scope.loadMedia = function () {
  $scope.loadEntity({
    filter: $scope.mediaQueryFilter,
    entity: 'media',
    loader: 'mediaFormLoader'
  });
};
$scope.loadMedia();

$scope.deleteMedia = function(media){
 $scope.hardDeleteEntity({
  loader: 'mediaFormLoader',
  entityName: 'Media',
  entityPath: 'media',
  entityId: media.componentMediaId,
  loadEntity: function(){
    $scope.loadMedia();
  }        
}); 
};    

$scope.toggleMediaStatus = function(media){
  $scope.toggleEntityStatus({
    entity: media,        
    entityId: media.componentMediaId,
    entityName: 'media',        
    loader: 'mediaFormLoader',
    loadEntity: function(){
      $scope.loadMedia();
    }
  });
};    

$scope.setUploadInput = function(uploader, form){
  if ($scope[uploader] 
    && $scope[uploader]._directives 
    && $scope[uploader]._directives.select 
    && $scope[uploader]._directives.select.length 
    && $scope[uploader]._directives.select[0].element 
    && $scope[uploader]._directives.select[0].element.length 
    && $scope[uploader]._directives.select[0].element[0].files
    && $scope[uploader]._directives.select[0].element[0].files.length) {
    $scope[form].uploadInput = true;
} else {
  $scope[uploader].clearQueue();
  $scope[form].uploadInput = false;
}
}

$scope.saveMedia = function () {
  $scope.mediaForm.link = $scope.mediaForm.originalLink;
  if ($scope.mediaForm.originalLink || 
    $scope.mediaUploader.queue.length === 0) {

    if (!$scope.mediaForm.originalLink) {          
      $scope.mediaForm.originalName = $scope.mediaForm.originalFileName;  
    } else {
      $scope.mediaForm.mimeType = '';
    }

    $scope.saveEntity({
      alertId: 'saveMedia',
      alertDiv: 'componentWindowDiv',
      loader: 'mediaFormLoader',
      entityName: 'media',
      entity: $scope.mediaForm,
      entityId: $scope.mediaForm.componentMediaId,
      formName: 'mediaForm',
      loadEntity: function () {
        $scope.loadMedia();
      }
    });
  } else {      
    $scope.mediaUploader.uploadAll();    
  }
};   

$scope.cancelMediaEdit = function () {
  $scope.cancelEdit('mediaForm');      
};

$scope.mediaUploader = new FileUploader({
  url: 'Media.action?UploadMedia',
  alias: 'file',
  queueLimit: 1,  
  removeAfterUpload: true,
  onAfterAddingFile: function(file){
    if (file._file && file._file.size && file._file.size >= 104857600) {
      triggerAlert('The file you have selected exceeds the file size limit of 100MB and will not be uploaded.', 'mediaLoader', 'body', 7000);
      this.removeFromQueue(file);          
      $scope.cancelMediaEdit();
      return;
    }
  },
  onBeforeUploadItem: function(item) {
    $scope.$emit('$TRIGGERLOAD', 'mediaFormLoader');

    item.formData.push({
      "componentMedia.componentId" : $scope.componentForm.componentId
    });
    item.formData.push({
      "componentMedia.mediaTypeCode" : $scope.mediaForm.mediaTypeCode
    });
//    item.formData.push({
//      "componentMedia.securityMarkingType" : $scope.mediaForm.securityMarkingType
//    });
    if ($scope.mediaForm.caption) {
      item.formData.push({
        "componentMedia.caption": $scope.mediaForm.caption
      });
    }
    if ($scope.mediaForm.componentMediaId) {
      item.formData.push({
        "componentMedia.componentMediaId": $scope.mediaForm.componentMediaId
      });
    }
    delete item.formData.type;
    console.log('item', item);
    
  },
  onSuccessItem: function (item, response, status, headers) {
    $scope.$emit('$TRIGGERUNLOAD', 'mediaFormLoader');

        //check response for a fail ticket or a error model
        if (response.success) {
          triggerAlert('Uploaded successfully', 'saveResource', 'componentWindowDiv', 3000);          
          $scope.cancelMediaEdit();          
          $scope.loadMedia();     
          
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
        $scope.$emit('$TRIGGERUNLOAD', 'mediaFormLoader');
        triggerAlert('Unable to upload media. Failure communicating with server. ', 'saveMedia', 'componentWindowDiv', 6000);        
        
      },
      onCompleteAll: function(){        
        document.mediaUIForm.uploadFile.value = null;
        $scope.mediaUploader.queue = [];      
      }      
    });     


//</editor-fold>

//<editor-fold   desc="Dependancy Section">

$scope.loadDependancies = function() {
  $scope.loadEntity({
    filter: $scope.dependencyFilter,
    entity: 'dependencies',
    loader: 'dependencyFormLoader'
  });
};
$scope.loadDependancies();    

$scope.toggleDependancyStatus = function(depend){
  $scope.toggleEntityStatus({
    entity: depend,        
    entityId: depend.dependencyId,
    entityName: 'dependencies',        
    loader: 'dependencyFormLoader',
    loadEntity: function(){
      $scope.loadDependancies();
    }
  });
};    

$scope.saveDependancy = function () {
  $scope.saveEntity({
    alertId: 'saveDependancy',
    alertDiv: 'componentWindowDiv',
    loader: 'dependencyFormLoader',
    entityName: 'dependencies',
    entity: $scope.dependencyForm,
    entityId: $scope.dependencyForm.dependencyId,
    formName: 'dependencyForm',
    loadEntity: function () {
      $scope.loadDependancies();
    }
  });       
};

//</editor-fold>    

//<editor-fold   desc="Metadata Section">

$scope.loadMetadata = function() {
  $scope.loadEntity({
    filter: $scope.metadataFilter,
    entity: 'metadata',
    loader: 'metadataFormLoader'
  });
};
$scope.loadMetadata();    

$scope.toggleMetadataStatus = function(meta){
  $scope.toggleEntityStatus({
    entity: meta,        
    entityId: meta.metadataId,
    entityName: 'metadata',        
    loader: 'metadataFormLoader',
    loadEntity: function(){
      $scope.loadMetadata();
    }
  });
};    

$scope.saveMetadata = function () {
  $scope.saveEntity({
    alertId: 'saveMetadata',
    alertDiv: 'componentWindowDiv',
    loader: 'metadataFormLoader',
    entityName: 'metadata',
    entity: $scope.metadataForm,
    entityId: $scope.metadataForm.metadataId,
    formName: 'metadataForm',
    loadEntity: function () {
      $scope.loadMetadata();
    }
  });       
};

//</editor-fold>   

//<editor-fold   desc="Evaluation Section">

$scope.loadEvaluationInfo = function(){
  $scope.$emit('$TRIGGERLOAD', 'evaluationLoader');

  Business.lookupservice.getLookupCodes('EvaluationSection', 'A').then(function (results) {      
    if (results) {
      $scope.activeSections = results;
      if ($scope.componentForm.componentId) {
        Business.componentservice.getEvaluationSections($scope.componentForm.componentId).then(function (data) {
          $scope.$emit('$TRIGGERUNLOAD', 'evaluationLoader');
          if (data) {
            $scope.allSections = data;  
            $scope.sections = [];
            $scope.oldSections = [];
            _.forEach($scope.allSections, function(record){
              var foundSection = _.find($scope.activeSections, {code : record.evaluationSection});
              if (foundSection) {
                $scope.sections.push(record);                    
              } else {
                $scope.oldSections.push(record);
              }
            });
            _.forEach($scope.activeSections, function(record){
              var foundSection = _.find($scope.allSections, {evaluationSection : record.code});
              if (!foundSection) {
                $scope.sections.push({
                  name: record.description,
                  evaluationSection: record.code,
                  sortOrder: record.sortOrder
                });                          
              }
            });
            var found = false;
            _.each($scope.sections, function(section){
              if (section.sortOrder) {
                found = true;
              }
            })
            if (found) {
              $scope.sections = _.sortBy($scope.sections, 'sortOrder');
            } else {
              $scope.sections = _.sortBy($scope.sections, 'name');
            }
            $scope.oldSections = _.sortBy($scope.oldSections, 'name');
          }
        });
} else {
  $scope.$emit('$TRIGGERUNLOAD', 'evaluationLoader');
}
}  
});      
};
$scope.loadEvaluationInfo();

$scope.clearAllEvaluationSections = function(){
  var response = window.confirm("Are you sure you want to DELETE all evaluation information for this component?");
  if (response) {
    $scope.$emit('$TRIGGERLOAD', 'evaluationLoader');      
    Business.componentservice.deleteAllEvaluationSection($scope.componentForm.componentId).then(function (results) {
      $scope.$emit('$TRIGGERUNLOAD', 'evaluationLoader');    
      triggerAlert('Remove all successfully', 'saveEvalSection', 'componentWindowDiv', 3000);
      $scope.loadEvaluationInfo();
    });
  }
};

$scope.saveEvalSection = function(section){
  if (section.actualScore) {
    if (section.actualScore < 1){
      section.actualScore = 1;
    } else if (section.actualScore > 5){
      section.actualScore = 5;
    }        
  }
  $scope.saveEntity({
    alertId: 'saveEvalSection',
    alertDiv: 'componentWindowDiv',
    loader: 'evaluationFormLoader',
    entityName: 'sections',
    entity: {
      "componentEvaluationSectionPk": {
        "evaluationSection": section.evaluationSection
      },
      "actualScore": section.actualScore,
      "notAvailable": section.notAvailable
    },
    entityId: section.evaluationSection,
    formName: 'evaluationForm',
    loadEntity: function () {
      $scope.loadEvaluationInfo();
    }
  });       

};

$scope.removeEvaluationSection = function(section){
  var response = window.confirm("Are you sure you want to DELETE section " + section.name + " for this component? (This will reset any unsaved changes)");
  if (response) {
    $scope.$emit('$TRIGGERLOAD', 'evaluationLoader');      
    Business.componentservice.deleteEvaluationSection($scope.componentForm.componentId, section.evaluationSection).then(function (results) {
      $scope.$emit('$TRIGGERUNLOAD', 'evaluationLoader');           
      $scope.loadEvaluationInfo();
    });
  }      
};    

$scope.checkEvalScore = function(section){
  if (section.actualScore) {
    if (section.actualScore < 1) {
      section.actualScore = 1;
    } else if (section.actualScore > 5) {
      section.actualScore = 5;
    }
  }      
};

$scope.saveAllEvalSections = function () {
  var allSections = [];
  _.forEach($scope.sections, function (section) {
    if (section.actualScore) {
      if (section.actualScore < 1) {
        section.actualScore = 1;
      } else if (section.actualScore > 5) {
        section.actualScore = 5;
      }
    }
    allSections.push({
      "componentEvaluationSectionPk": {
        "evaluationSection": section.evaluationSection
      },
      "actualScore": section.actualScore,
      "notAvailable": section.notAvailable
    });
  });

  $scope.$emit('$TRIGGERLOAD', 'evaluationLoader');
  Business.componentservice.saveAllEvaluationSections({
    componentId: $scope.componentForm.componentId,
    sections: allSections
  }).then(function (results) {
    $scope.$emit('$TRIGGERUNLOAD', 'evaluationLoader');
    triggerAlert('Saved all successfully', 'saveEvalSection', 'componentWindowDiv', 3000);
    $scope.loadEvaluationInfo();
  });
};



//</editor-fold>   

//<editor-fold   desc="Tags Section">

$scope.loadTags = function() {
  if ($scope.componentForm.componentId) {
    $scope.$emit('$TRIGGERLOAD', 'tagFormLoader');        
    Business.componentservice.getComponentTagViews($scope.componentForm.componentId).then(function (results) {
      $scope.$emit('$TRIGGERUNLOAD', 'tagFormLoader');
      if (results) {
        $scope.tags = results;
      }
    }, function(){
    });
  }     
  $scope.tagForm.securityMarkingType = null;
  $scope.tagForm.text = null;
};
$scope.loadTags();

$scope.saveTag = function () {
  $scope.saveEntity({
    alertId: 'saveTag',
    alertDiv: 'componentWindowDiv',
    loader: 'tagFormLoader',
    entityName: 'tags',
    entity: $scope.tagForm,
    entityId: $scope.tagForm.tagId,
    formName: 'tagForm',
    loadEntity: function () {
      $scope.loadTags();
    }
  });  
};

$scope.removeTag = function(tag){       
  $scope.$emit('$TRIGGERLOAD', 'tagFormLoader');        

  Business.componentservice.inactivateEnity({
    componentId: $scope.componentForm.componentId,
    entityId: tag.tagId,
    entity: 'tags'
  }).then(function (results) {
    $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'tagFormLoader');
    $scope.loadTags();            
  });         
};

//</editor-fold>  

//<editor-fold   desc="Reviews Section">

$scope.loadReviews = function() {
  $scope.loadEntity({
    filter: $scope.reviewFilter,
    entity: 'reviews',
    loader: 'reviewFormLoader'
  });
};
$scope.loadReviews();    

$scope.toggleReviewStatus = function(review){
  $scope.toggleEntityStatus({
    entity: review,        
    entityId: review.reviewId,
    entityName: 'reviews',        
    loader: 'reviewFormLoader',
    loadEntity: function(){
      $scope.loadReviews();
    }
  });
}; 

//</editor-fold>  

//<editor-fold   desc="Questions Section">

$scope.loadQuestions = function() {
  $scope.loadEntity({
    filter: $scope.questionFilter,
    entity: 'questions',
    loader: 'questionFormLoader',
    callback: function(results){
      _.forEach(results, function(question){
        if (!($scope.questionDetailsShow[question.questionId])){
          $scope.questionDetailsShow[question.questionId] = {};
          $scope.questionDetailsShow[question.questionId].flag = false;
          $scope.questionDetailsShow[question.questionId].showResponsesText = 'Show';
        }
      });
    }    
  });
};
$scope.loadQuestions();    

$scope.toggleQuestionStatus = function(question){
  $scope.toggleEntityStatus({
    entity: question,        
    entityId: question.questionId,
    entityName: 'questions',        
    loader: 'questionFormLoader',
    loadEntity: function(){
      $scope.loadQuestions();
    }
  });
}; 

$scope.showQuestionResponses = function(question){
 $scope.questionDetailsShow[question.questionId].flag = !$scope.questionDetailsShow[question.questionId].flag;
 if ($scope.questionDetailsShow[question.questionId].flag === false){
   $scope.questionDetailsShow[question.questionId].showResponsesText = 'Show';
 } else {
   $scope.questionDetailsShow[question.questionId].showResponsesText = 'Hide';
 }        
};


$scope.toggleQuestionResponseStatus = function(questionResponse, question){
  $scope.$emit('$TRIGGERLOAD', 'questionFormLoader');
  if (questionResponse.activeStatus === 'A') {
    Business.componentservice.inactivateQuestionResponse({
      componentId: $scope.componentForm.componentId,
      questionId: question.questionId,
      responseId: questionResponse.responseId
    }).then(function (results) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'questionFormLoader');
      $scope.loadQuestions();
    });
  } else {
    Business.componentservice.activateQuestionResponse({
      componentId: $scope.componentForm.componentId,
      questionId: question.questionId,
      responseId: questionResponse.responseId
    }).then(function (results) {
      $scope.$emit('$TRIGGEREVENT', '$TRIGGERUNLOAD', 'questionFormLoader');
      $scope.loadQuestions();
    });
  }
};  

//</editor-fold>  


$scope.close = function () {
  $scope.$emit('$TRIGGEREVENT', '$CLOSEMSG');
  $uiModalInstance.dismiss('close');
};

}]);

app.controller('messageSubmitterCtrl',['$scope', '$draggableInstance', 'submitter', 'business', '$location', function ($scope, $draggableInstance, submitter, Business, $location) {

  $scope.submitter = submitter || {};


  $scope.ok = function () {
    $draggableInstance.close();
  };

  $scope.cancel = function () {
    $draggableInstance.dismiss('cancel');
  };

  $scope.$on('$CLOSEMSG', function(){
    $draggableInstance.dismiss('cancel');
  })
}]);

'use strict';

app.filter('requiredByComponentType', function () {
  return function (input, type, inverse) {
    if (!input) {
      return [];
    } else if (!type) {
      return input;
    } else {
      var results =[];
      _.each(input, function(thing){
        if (thing && thing.requiredFlg) {
          if (!thing.requiredRestrictions) {
            // console.log('is required but not restricted', thing);
            
            if (!inverse){
              results.push(thing);
            }
          } else if (thing.requiredRestrictions && _.find(thing.requiredRestrictions, {'componentType': type})){
            // console.log('is required and has the right type', thing);
            if (!inverse){
              results.push(thing);
            }
          } else {
            // console.log('is required but not the right type', thing);
            if (inverse){
              results.push(thing);
            }
          }
        }
      });
      return results;
    }
  };
});


// byComponentType: {{componentForm.componentType}}