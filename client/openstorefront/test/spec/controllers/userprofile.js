'use strict';

describe('Controller: UserProfileCtrl', function () {

  // // load the controller's module
  beforeEach(module('openstorefrontApp'));

  var UserProfileCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    UserProfileCtrl = $controller('UserProfileCtrl', {
      $scope: scope
    });
  }));

  it('should have the correct initializations', function () {
    expect(scope.total).toEqual({});
    expect(scope.userProfileForm).toEqual({});
    expect(scope._scopename).toEqual('userprofile');  //NOTE this is set to 'userprofile' when scoped!
    expect(scope.pageTitle).toEqual('DI2E Clearinghouse');  //NOTE this is set to 'DI2E Clearinghouse' when scoped!
    expect(scope.defaultTitle).toEqual('Browse Categories');
    expect(scope.untilDate.toString()).toEqual(new Date().toString());
    expect(scope.review).toEqual(null);
    expect(scope.user).toEqual({});
    expect(scope.nav).toEqual({
      'current': null,
      'bars': [
          { 'title': 'User Profile', 'include': 'views/userprofiletab.html' },
          { 'title': 'Watches', 'include': 'views/watchestab.html' },
          { 'title': 'Component Reviews', 'include': 'views/feedbacktab.html' },
          { 'title': 'Submissions', 'include': 'views/submissions.html' }
      ]
    });
  });

  it('should validate functions that return values', function() {
    expect(scope.validateEmail('complete_email@whatever.com')).toBeTruthy();
    expect(scope.validateEmail('incomplete_email')).toBeFalsy();
    expect(scope.validateEmail('wrongEmail@@wrong.com')).toBeFalsy();
    expect(scope.validateEmail('blah@whatevercom')).toBeFalsy();

    expect(scope.getDate(1440186375456)).toEqual('8/21/2015');
    expect(scope.isNewer(1440186375456,1440101702555)).toEqual(true);
    expect(scope.isNewer(1440101702555,1440186375456)).toEqual(false);
  });

  it('should validate properly using spies', function() {
    spyOn(scope, 'sendTestEmail');
    spyOn(scope, 'saveUserProfile');

    scope.sendTestEmail();
    scope.saveUserProfile();

    expect(scope.sendTestEmail).toHaveBeenCalled();
    expect(scope.saveUserProfile).toHaveBeenCalled();
  });

});
