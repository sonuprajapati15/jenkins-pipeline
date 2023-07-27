require(['jquery', 'XWikiNotificationsMacro', 'xwiki-meta'], function ($, XWikiNotificationsMacro, xm) {
  'use strict';

  /**
   * The notification batch' size
   */
  var notificationsLimit = 10;

  /**
   * Maximum number of events to count
   */
  var maxCountNumber = 20;

  /**
   * The current number of unread notifications (-1 means we don't know yet how many notifications there are)
   */
  var notificationCount = -1;

  /**
   * URL to the service that return the notifications to display
   */
  var url = new XWiki.Document(XWiki.Model.resolve('XWiki.Notifications.Code.NotificationsDisplayerUIX',
    XWiki.EntityType.DOCUMENT)).getURL('get', 'outputSyntax=plain');

  /**
   * Will contain the Notifications Macro object.
   */
  var macro = 0;

  /**
   * Update notification counter
   */
  var updateNotificationCount = function (count) {
    // Get the counter
    var counter = $('.notifications-count');
    // Update the global variable
    notificationCount = count;
    // Remove the counter if there is no unread notifications
    if (count == 0) {
      counter.remove();
      return;
    }
    // Create the counter if it is not present
    if (counter.length == 0) {
      counter = $('<span>').addClass('notifications-count badge');
      $('#tmNotifications > a.icon-navbar').after(counter);
    }
    // Update the counter
    counter.text(count);
    if (count > maxCountNumber) {
      counter.text(maxCountNumber + '+');
    };
  };

  /**
   * Add a button to clear all the notifications (which actually only change the start date of the user).
   */
  var createCleanButton = function (startDate) {
    var notificationsHeader = $('.notifications-header-uix');
    // If the clean button is already here, don't do anything
    if (notificationsHeader.find('a.notification-event-clean').length > 0) {
      return;
    }
    var markAllReadButton = $('<a href="#">')
      .addClass('notification-event-clean')
      .html('<img src="../../../resources/icons/silk/bin.png" alt="Icon" />&nbsp;Clear All')
      .click(function (event) {
        // Avoid the menu closing
        event.stopPropagation();
        // Ask confirmation
        new XWiki.widgets.ConfirmationBox({
          onYes: function(event) {
            // Avoid the menu closing
            event.stopPropagation();
            // Display a saving message
            var notification = new XWiki.widgets.Notification("Clearing the notifications", 'inprogress');
            // Send the request to change the start date
            $.post(url, {
              action: 'setStartDate',
              date: startDate
            }).success(function (){
              // Display the success message
              notification.hide();
              new XWiki.widgets.Notification("Notifications have been cleared", 'done');
              // Remove the notifications from the UI and display the "nothing!" message instead.
              $('.notifications-area').html($('<p>').addClass('text-center noitems').text("No notifications available!"));
              // Update the notifications counter
              updateNotificationCount(0);
            });
          },
          onNo: function(event) {
            // Avoid the menu closing
            event.stopPropagation();
          }
        });
      });
    // Append the button just before the "settings" link in the menu
    $('.notifications-header-uix').append(markAllReadButton);
  };

  /**
   * Get the number of unread notifications.
   */
  var getUnreadNotificationsCount = function (asyncId) {
    var restURL = '\/xwiki/rest/notifications/count?media=json';
    var params = {
      'userId':              XWiki.Model.serialize(xm.userReference),
      'useUserPreferences':  true,
      'currentWiki':         xm.documentReference.extractReferenceValue(XWiki.EntityType.WIKI),
      'async':               true
    };
    if (asyncId) {
      params.asyncId = asyncId;
    }
    $.ajax(restURL, {cache: false, data: params}).done(function (data, textStatus, jqXHR) {
      switch (jqXHR.status) {
          case 200:
            // 200 means that the search is done, we displayer the count notifications
            updateNotificationCount(data.unread);
            break;
          case 202:
            // 202 means that the background search is still running, we wait 1 second and ask again if it's done this time
            setTimeout(getUnreadNotificationsCount, 1000, data.asyncId);
            break;
      }
    });
  };

  /**
   * Initialize the widget.
   */
  $(document).ready(function () {

    var container = $('.notifications-area');
    macro = new XWikiNotificationsMacro(container, XWiki.Model.serialize(xm.userReference), notificationsLimit, true, [], true);
    getUnreadNotificationsCount();
    container.on('eventMarkedAsRead', function (notif) {
      updateNotificationCount(notificationCount - 1);
    });

    /**
     * Prevent the dropdown menu for being closed when the user clicks on the notifications menu.
     */
    $('#tmNotifications .dropdown-menu').click(function(event) {
      event.stopPropagation();
    });

    /**
     * Load the notifications content when the user open the notification menu (lazy loading to have better scalability).
     */
    var notificationsMenusHasBeenOpened = false;
    $('#tmNotifications').on('show.bs.dropdown', function () {
      // Don't load the notifications if the menu has already be opened before.
      if (!notificationsMenusHasBeenOpened) {
        macro.load(0).done(function (notifications) {
          if (notifications.length > 0) {
            createCleanButton(notifications[0].date);
          }
        });
      }
      notificationsMenusHasBeenOpened = true;
    });
  });

});

require.config({
  paths: {
    'bootstrap-switch': '../../../webjars/bootstrap-switch/3.3.2/js/bootstrap-switch.min.js'
  },
  shim: {
    'bootstrap-switch' : ['jquery']
  }
});
require(['jquery', 'xwiki-meta', 'bootstrap', 'bootstrap-switch'], function ($, xm) {
  'use strict';
  // Most of the code comes from the deprecated Watchlist Application
  $(document).ready(function() {

    ///
    /// Get the notification inputs for future usage
    ///
    var watchWikiSwitch  = $('#notificationWiki');
    var watchSpaceSwitch = $('#notificationPageAndChildren');
    var watchPageSwitch  = $('#notificationPageOnly');
    var allWatchSwitches = $([watchWikiSwitch, watchSpaceSwitch, watchPageSwitch]);

    ///
    /// Set the icon corresponding to each switch
    ///
    watchPageSwitch.bootstrapSwitch('labelText', '<img src=\"..\/..\/..\/resources\/icons\/silk\/page.png\" alt=\"Icon\" \/>');
    watchSpaceSwitch.bootstrapSwitch('labelText', '<img src=\"..\/..\/..\/resources\/icons\/silk\/chart_organisation.png\" alt=\"Icon\" \/>');
    watchWikiSwitch.bootstrapSwitch('labelText', '<img src=\"..\/..\/..\/resources\/icons\/silk\/world.png\" alt=\"Icon\" \/>');

    ///
    /// Disabled switches if there is no enabled notification preferences
    ///
    if ($('.notifications-toggles').attr('data-enabled') == 'false') {
      allWatchSwitches.bootstrapSwitch('disabled', true);

      $('.notifications-toggles').tooltip({
        title: 'You need to enable notifications in your settings if you wish to watch these locations',
        placement: 'bottom'
      });
    } else {
      ///
      /// Add a tooltip to each switch
      ///
      $('.bootstrap-switch-id-notificationPageOnly').tooltip({
        title: 'watchlist.notifications.icons.tooltip.page',
        placement: 'bottom'
      });
      var watchSpaceToolTip = 'watchlist.notifications.icons.tooltip.pageAndChildren';
      if (xm.documentReference.name != 'WebHome') {
        // Adapt the tooltip when the current document is terminal
        watchSpaceToolTip = 'watchlist.notifications.icons.tooltip.space';
      }
      $('.bootstrap-switch-id-notificationPageAndChildren').tooltip({
        title: watchSpaceToolTip,
        placement: 'bottom'
      });
      $('.bootstrap-switch-id-notificationWiki').tooltip({
        title: 'watchlist.notifications.icons.tooltip.wiki',
        placement: 'bottom'
      });
    }
    
    allWatchSwitches.bootstrapSwitch('size', 'small');

    /**
     * Change the watchlist status of a document/space/wiki.
     */
    var changeWatchListStatus = function (action, location, type) {
      // Disable the toggles so that the user cannot click on them during the request
      allWatchSwitches.bootstrapSwitch('disabled', true);
      /**
       * URL to the service that return the notifications to display
       */
      var url = new XWiki.Document(XWiki.Model.resolve('XWiki.Notifications.Code.NotificationsDisplayerUIX', XWiki.EntityType.DOCUMENT)).getURL('get', 'outputSyntax=plain');
      var notification = new XWiki.widgets.Notification("Your settings are being saved...", 'inprogress');
      $.post(url, {
        'action': action,
        'location': location,
        'type': type,
        'currentDoc': XWiki.Model.serialize(xm.documentReference)
      }).done(function (data) {
        // Unfortunately, bootstrap switch does not allow to change the state if it is disabled
        allWatchSwitches.bootstrapSwitch('disabled', false);
        // Update states
        watchPageSwitch.bootstrapSwitch('state', data.document, true);
        watchSpaceSwitch.bootstrapSwitch('state', data.space, true);
        watchWikiSwitch.bootstrapSwitch('state', data.wiki, true);
        // Display success message
        notification.hide();
        new XWiki.widgets.Notification("Saved!", 'done');
      }).fail (function() {
        notification.hide();
        new XWiki.widgets.Notification('watchlist.notifications.changeStatusError', 'error');
        allWatchSwitches.bootstrapSwitch('disabled', false);
      });
    };

    ///
    /// Change the watchlist status when the switched are manipulated by the user
    ///
    watchPageSwitch.bootstrapSwitch('onSwitchChange', function (event, status) {
      changeWatchListStatus(status ? 'watchLocation' : 'unwatchLocation', XWiki.Model.serialize(xm.documentReference), 'document');
    });
    watchSpaceSwitch.bootstrapSwitch('onSwitchChange', function (event, status) {
      changeWatchListStatus(status ? 'watchLocation' : 'unwatchLocation', XWiki.Model.serialize(xm.documentReference.extractReference(XWiki.EntityType.SPACE)), 'space');
    });
    watchWikiSwitch.bootstrapSwitch('onSwitchChange', function (event, status) {
      changeWatchListStatus(status ? 'watchLocation' : 'unwatchLocation', XWiki.Model.serialize(xm.documentReference.extractReference(XWiki.EntityType.WIKI)), 'wiki');
    });

    ///
    /// Avoid the dropdown menu to be closed when the user click on the bootstrap switch
    ///
    $('.notifications-toggles .bootstrap-switch').click(function(event) {
      event.stopImmediatePropagation();
    });
 });
});

