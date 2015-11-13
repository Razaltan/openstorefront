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
/* global Ext */

Ext.define('OSF.component.NotificationPanel', {
  extend: 'Ext.panel.Panel',
  alias: 'osf.widget.NotificationPanel',
  
   layout: 'fit',
  
   initComponent: function() {
     this.callParent();
     
     
     var notPanel = this;
     notPanel.loadAll = false;
     
     var dataStore = Ext.create('Ext.data.Store', {				
				autoLoad: true,          
				fields:[ 
            'eventId', 
            'eventType',
            'eventTypeDescription',
            'message',
            'username',
            'roleGroup',
            'entityName',
            'entityId',
            'entityMetaDataStatus',
            'createDts',
            'updateDts',
            'readMessage'
          ],
				proxy: {
					type: 'ajax',
					url: '../api/v1/resource/notificationevent',
             reader: {
               type: 'json',
               rootProperty: 'data',
               totalProperty: 'totalNumber'
             }
				}
	 });    
   
     var actionMarkAsRead = function(record) {
        CoreService.usersevice.getCurrentUser().then(function(response){
          var usercontext = Ext.decode(response.responseText);
          Ext.Ajax.request({
            url: '../api/v1/resource/notificationevent/'+record.get('eventId'),
            method: 'PUT',
            jsonData: {
              username: usercontext.username
            },
            success: function(response) {
             notPanel.notificationGrid.getStore().load({
               params: {
                 all: notPanel.loadAll
               }
             });         
            }
          });
        });
     };

     var actionRemove = function(record) {
        Ext.Ajax.request({
          url: '../api/v1/resource/notificationevent/'+record.get('eventId'),
          method: 'DELETE',
          success: function(response) {
           notPanel.notificationGrid.getStore().load({
               params: {
                 all: notPanel.loadAll
               }
             });
          }
        });      
     };

     notPanel.notificationGrid = Ext.create('Ext.grid.Panel', {
        store: dataStore,
        columnLines: true,
        columns: [
          {
            text: 'Unread',
            width: 75,
            align: 'center',
            dataIndex: 'readMessage',
            //xtype: 'widgetcolumn',
            renderer: function(value) {
                   if (value) {
                     return '';
                   } else {
                     return '<i class="fa fa-check" title="Mark as read"></i>';                   
                   }
            }         
          },
               { text: 'Event Date', dataIndex: 'createDts', width: 150, xtype: 'datecolumn', format:'m/d/y H:i:s' },
            { text: 'Type', groupable: 'true', dataIndex: 'eventTypeDescription', width: 175 },
            { text: 'Message', dataIndex: 'message', flex: 1, 
                renderer: function(value, metadata, record) {
                  switch (record.get('eventType')) {
                    case 'WATCH':
                      return value + '<i>View the changes <a href="../single?id=' + record.get('entityId') + '"><strong>here</strong></a>.</i>';
                      break;
                    case 'REPORT':
                      return value + '<i>View/Download the report <a href="../tools?tool=Reports"><strong>here</strong></a></i>.';
                      break;
                    case 'ADMIN':
                      return '<i class="fa fa-warning"></i>&nbsp;' + value;
                      break;
                    case 'TASK':
                    case 'IMPORT':
                    default:
                      return value;
                      break;
                  }
                }
               },
               {
                 text: 'Action', 
                 dataIndex: '',
                 sortable: false,
                 xtype: 'widgetcolumn',
                 align: 'center',
                 width: 75,               
                 widget: {
                   xtype: 'button',
                   iconCls: 'fa fa-trash',
                   maxWidth: 25,
                   cls: 'button-danger',
                   handler: function() {
                     var record = this.getWidgetRecord();
                     actionRemove(record);
                   }
                 }
               }
       ],
        listeners: {
          cellclick: function( grid, td, cellIndex, record, tr, rowIndex, e, eOpts){
            if (cellIndex === 0) {
              actionMarkAsRead(record);
            }
          }
        },
        dockedItems: [
          {
            dock: 'top',
            xtype: 'toolbar',
            items: [
              {
                text: 'Refresh',
             scale: 'medium',								
             iconCls: 'fa fa-2x fa-refresh',
             handler: function () {
                this.up('grid').getStore().load({
                    params: {
                      all: notPanel.loadAll
                    }
                  });	
             }              
              }, 
              {
                xtype: 'tbseparator' 
              },
              {
                 text: 'Unread',
                 scale: 'medium',	
                 pressed: true,
                 toggleGroup: 'filter',
                 handler: function () {
                    notPanel.loadAll = false,
                    this.up('grid').getStore().load({
                          params: {
                            all: false
                          }
                        });	
                    } 
              },
              {
                 text: 'All',
                 scale: 'medium',
                 toggleGroup: 'filter',
                 handler: function () {
                    notPanel.loadAll = true,
                    this.up('grid').getStore().load({
                            params: {
                            all: true
                          }
                        });	
                    } 
              }
            ]
          }, 
          {
            dock: 'bottom',
            xtype: 'panel',
            html: 'Loading...',
            listeners: {
              beforerender: function(panel){
                   Ext.Ajax.request({
                     url: '../api/v1/service/application/configproperties/notification.max.days',
                     success: function(response) {
                       var keyData = Ext.decode(response.responseText);
                       panel.update('*Notifications time out after <b>' + keyData.description +  '</b> day(s)');
                     }
                   });
              }
            }
          }
        ]
     });

     notPanel.add(notPanel.notificationGrid);
     
   },
  
  refreshData: function(){
    this.notificationGrid.getStore().load({
        params: {
          all: this.loadAll
        }
    });
  }
  
});

