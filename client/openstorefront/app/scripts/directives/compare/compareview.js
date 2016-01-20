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

app.directive('compareview', ['$timeout', 'business', function ($timeout, Business) {
  return {
    templateUrl: 'views/details/compare.html',
    restrict: 'E',
    scope: {
      dataleft: '=',
      dataright: '='
    },
    link: function postLink(scope, element, attrs) {

      Business.lookupservice.getEvaluationSections().then(function(result) {
        scope.evalSectionDescriptionMap = result? result : [];
        // console.log('sections', result);
      })

      scope.checked = {};
      scope.getObjectContent = function(details) {
        var temp = {};
        temp.value = [];
        var keys = Object.keys(details);
        _.each(keys, function(prop){
          var property = {};
          property.checkedLabel = camelToSentence(prop);
          property.data = details[prop];
          property.checked = true;
          scope.checked[prop] = scope.checked[prop]? scope.checked[prop]: property;
          temp[prop] = property;
        })
        if (temp.value){
          delete temp.value;
        }
        var badgeProp = {
          checkedLabel: 'Badges',
          checked: true,
          data: ''
        };
        temp['badges']=badgeProp;
        scope.checked['badges'] = scope.checked['badges']? scope.checked['badges']: badgeProp;
        // details.checkedLabel = camelToSentence();
        
        return temp;
      }


      scope.reset = function() {
        _.each(scope.checked, function(detail){
          detail.checked = true;
        });
      }

      scope.getDate = function(date) {
        return utils.getDate(date);
      };

      scope.print = function() {
        window.print();
      }

      scope.formatTags = function(tags) {
        var result = '';
        _.each(tags, function(tag) {
          if (result.length > 0) {
            result = result + ", " + tag.text;
          } else {
            result = tag.text;
          }
        });
        return result;
      }

      scope.isEvaluationPresent = function(details) {
        return details.evaluation.checked && details.evaluation.data && details.evaluation.data.evaluationSections && details.evaluation.data.evaluationSections.length;
      }

      scope.getFullRating = function(num) {
        return new Array(num);   
      }
      scope.getEmptyRating = function(num) {
        var length = ((5 - num) > 0)? (5 - num):0; 
        return new Array(length);
      }

      scope.getTimes = function(n){
        if (n) {
          return new Array(parseInt(n));
        } else {
          return new Array(0);
        }
      };

      scope.$watch('dataleft', function(){
        if (scope.dataleft){
          scope.detailsleft = angular.copy(scope.getObjectContent(scope.dataleft));
          scope.resetHeights();
        };
      });

      scope.$watch('dataright', function(){
        if (scope.dataright){
          scope.detailsright = angular.copy(scope.getObjectContent(scope.dataright));
          scope.resetHeights();
        };
      });


      var resetHeight = function(idleft, idright) {

        element.find('#' + idright).css('height', '');
        element.find('#' + idleft).css('height', '');
        $timeout(function(){
          var left = $('#' + idleft).outerHeight();
          var right = $('#' + idright).outerHeight();
          if (left > right) {
            element.find('#' + idright).css('height', left + 'px');
          } else {
            element.find('#' + idleft).css('height', right + 'px');
          }
        },10)
      }

      /***************************************************************
      * This function saves a component's tags
      ***************************************************************/
      scope.getEvalDescription = function(col){
        var section = _.find(scope.evalSectionDescriptionMap, {'description': col.name});
        return section? section.detailedDescription: '';
      };

      var timeout;
      $(window).resize(function() {
        clearTimeout(timeout);
        timeout = setTimeout(function() {
          scope.resetHeights();
        }, 500)
      })

      scope.resetHeights = function() {
        if (scope.detailsright && scope.detailsleft) {
          $timeout(function(){
           // element.find('*').css('height', 'auto');
           resetHeight('linersleft', 'linersright');
           resetHeight('tagsleft', 'tagsright');
           resetHeight('badgeleft', 'badgeright');
           resetHeight('detailsleft', 'detailsright');
           resetHeight('factorsleft', 'factorsright');
           resetHeight('resourcesleft', 'resourcesright');
           resetHeight('attributesleft', 'attributesright');
           resetHeight('contactsleft', 'contactsright');
           resetHeight('subcomponentsleft', 'subcomponentsright');
           resetHeight('dependenciesleft', 'dependenciesright');
           resetHeight('reviewsleft', 'reviewsright');
           resetHeight('questionsleft', 'questionsright');
         }, 100);
        }
      }

      $(window).scroll(function(){
        var scrollTop     = $(window).scrollTop();
        var elementOffset = $('#detailChecklist').offset().top;
        var distance      = (elementOffset - scrollTop);

        if (scrollTop > 337) {
          $('#detailChecklist').css({
            'position': 'fixed',
            'top': '54px'
          })
        } else {
          $('#detailChecklist').css({
            'position': 'absolute',
            'top': '392px'
          })
        }

      })
    }
  }
}]);
