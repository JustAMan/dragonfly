﻿window.cls || (window.cls = {});

/**
  * @constructor 
  * @extends DOM_markup_style
  */

cls.DOMView = function(id, name, container_class)
{

  this.createView = function(container)
  {
    if (this._create_view_no_data_timeout)
    {
      clearTimeout(this._create_view_no_data_timeout);
      this._create_view_no_data_timeout = 0;
    }
    if (dom_data.has_data())
    {
      var model = window.dominspections.active;
      var scrollTop = container.scrollTop;      
      container.clearAndRender(window.templates.inspected_dom_node(window.dom_data, 
                                                                   model && model.target, 
                                                                   true));
      if (!window.helpers.scroll_dom_target_into_view())
      {
        container.scrollTop = scrollTop;
      }
      if (model == window.dom_data)
      {
        window.modebar.set_content(model.id, window.templates.breadcrumb(model, model.target), true);
      }
    }
    else
    {
      this._create_view_no_data_timeout = setTimeout(this._create_view_no_data, 100, container);
    }
  };

  this._create_view_no_data_timeout = 0;

  this._create_view_no_data = function(container)
  {
    if(!dom_data.getDataRuntimeId())
    {
      container.innerHTML = 
        "<div class='padding'><div class='info-box'>" +
          ui_strings.S_INFO_WINDOW_HAS_NO_RUNTIME +
        "</div></div>";
    }
    else
    {
      container.innerHTML = "<div class='padding' edit-handler='edit-dom'><p></p></div>";
    }
  }

  this.ondestroy = function()
  {
    window.hostspotlighter.clearSpotlight();
  }

  this._on_setting_change = function(msg)
  {
    if( msg.id == this.id )
    {
      switch (msg.key)
      {
        case 'dom-tree-style':
        {
          this.update();
          break;
        }
      }
    }
  }

  messages.addListener('setting-changed', this._on_setting_change.bind(this));
  this.init(id, name, container_class);

}

cls.DocumentSelect = function(id)
{

  var selected_value = "";

  this.getSelectedOptionText = function()
  {
    var selected_rt_id = dom_data.getDataRuntimeId();
    if(selected_rt_id)
    {
      var rt = runtimes.getRuntime(selected_rt_id);
      if( rt )
      {
        return rt['title'] || helpers.shortenURI(rt.uri).uri;
      }
    }
    return '';
  }

  this.getSelectedOptionValue = function()
  {

  }

  this.templateOptionList = function(select_obj)
  {
    
    // TODO this is a relict of protocol 3, needs cleanup
    var active_window_id = runtimes.getActiveWindowId();

    if( active_window_id )
    {
      var 
      _runtimes = runtimes.getRuntimes(active_window_id),
      rt = null, 
      i = 0;

      for( ; ( rt = _runtimes[i] ) && !rt['selected']; i++);
      if( !rt && _runtimes[0] )
      {
        opera.postError(ui_strings.DRAGONFLY_INFO_MESSAGE + 'no runtime selected')
        return;
      }
      return templates.runtimes(_runtimes, 'dom');
    }
    
  }

  this.checkChange = function(target_ele)
  {
    var rt_id = parseInt(target_ele.getAttribute('runtime-id'));

    if( rt_id != dom_data.getDataRuntimeId() )
    {
      if(rt_id)
      {
        dom_data.get_dom(rt_id);
      }
      else
      {
        opera.postError(ui_strings.DRAGONFLY_INFO_MESSAGE +
          "missing runtime id in cls.DocumentSelect.checkChange")
      }
      return true;
    }
    return false;
  }

  // this.updateElement

  this.init(id);
}


cls.DOMView.create_ui_widgets = function()
{

  new Settings
  (
    // id
    'dom', 
    // kel-value map
    {

      'find-with-click': true,
      'highlight-on-hover': true,
      'update-on-dom-node-inserted': false,
      'force-lowercase': true, 
      'show-comments': true, 
      'show-attributes': true,
      'show-whitespace-nodes': true,
      'dom-tree-style': false,
      'show-siblings-in-breadcrumb': false,
      'show-id_and_classes-in-breadcrumb': true,
      'scroll-into-view-on-spotlight': true,
      'lock-selected-elements': false
    }, 
    // key-label map
    {
      'find-with-click': ui_strings.S_SWITCH_FIND_ELEMENT_BY_CLICKING,
      // TODO change to highlight
      'highlight-on-hover': ui_strings.S_SWITCH_HIGHLIGHT_SELECTED_OR_HOVERED_ELEMENT,
      'update-on-dom-node-inserted': ui_strings.S_SWITCH_UPDATE_DOM_ON_NODE_REMOVE,
      'force-lowercase': ui_strings.S_SWITCH_USE_LOWER_CASE_TAG_NAMES, 
      'show-comments': ui_strings.S_SWITCH_SHOW_COMMENT_NODES, 
      'show-attributes': ui_strings.S_SWITCH_SHOW_ATTRIBUTES,
      'show-whitespace-nodes': ui_strings.S_SWITCH_SHOW_WHITE_SPACE_NODES,
      'dom-tree-style': ui_strings.S_SWITCH_SHOW_DOM_INTREE_VIEW,
      'show-siblings-in-breadcrumb': ui_strings.S_SWITCH_SHOW_SIBLINGS_IN_BREAD_CRUMB,
      'show-id_and_classes-in-breadcrumb': ui_strings.S_SWITCH_SHOW_ID_AND_CLASSES_IN_BREAD_CRUMB,
      'scroll-into-view-on-spotlight': ui_strings.S_SWITCH_SCROLL_INTO_VIEW_ON_FIRST_SPOTLIGHT,
      'lock-selected-elements': ui_strings.S_SWITCH_LOCK_SELECTED_ELEMENTS
    
    },
    // settings map
    {
      checkboxes:
      [
        'force-lowercase',
        'dom-tree-style',
        'show-comments',
        'show-attributes',
        'show-whitespace-nodes',
        'find-with-click',
        'highlight-on-hover',
        'update-on-dom-node-inserted',
        'show-siblings-in-breadcrumb',
        'show-id_and_classes-in-breadcrumb',
        'scroll-into-view-on-spotlight',
        'lock-selected-elements'
      ],
      contextmenu:
      [
        'dom-tree-style',
        'show-comments',
        'lock-selected-elements'
      ]
    },
    null,
    "document"
  );

  new ToolbarConfig
  (
    'dom',
    [
      {
        handler: 'dom-inspection-snapshot',
        title: ui_strings.S_BUTTON_LABEL_GET_THE_WOHLE_TREE
      },
      {
        handler: 'dom-inspection-export',
        title: ui_strings.S_BUTTON_LABEL_EXPORT_DOM
      }
    ],
    [
      {
        handler: 'dom-text-search',
        title: ui_strings.S_INPUT_DEFAULT_TEXT_SEARCH
      }
    ],
    null,
    [
      {
        handler: 'select-window',
        title: ui_strings.S_BUTTON_LABEL_SELECT_WINDOW,
        type: 'dropdown',
        class: 'window-select-dropdown',
        template: window['cst-selects']['document-select'].getTemplate()
      }
    ]
  )

  var contextmenu = new ContextMenu();

  var dom_element_common_items = [
    {
      label: ui_strings.M_CONTEXTMENU_EDIT_MARKUP,
      handler: contextmenu_edit_markup
    },
    {
      label: ui_strings.M_CONTEXTMENU_REMOVE_NODE,
      handler: contextmenu_remove_node
    }
  ];

  contextmenu.register("dom-element", [
    {
      callback: function(event, target)
      {
        var target = event.target;
        while (!/^(?:key|value|text|node)$/.test(target.nodeName.toLowerCase()))
        {
          target = target.parentNode;
        }

        switch (target.nodeName.toLowerCase())
        {
        case "node":
          return [
            {
              label: ui_strings.M_CONTEXTMENU_ADD_ATTRIBUTE,
              handler: contextmenu_add_attribute
            }
          ]
          .concat(ContextMenu.separator)
          .concat(dom_element_common_items);
          break;

        case "key":
          return [
            {
              label: ui_strings.M_CONTEXTMENU_EDIT_ATTRIBUTE,
              handler: contextmenu_edit_dom
            },
            {
              label: ui_strings.M_CONTEXTMENU_ADD_ATTRIBUTE,
              handler: contextmenu_add_attribute
            }
          ]
          .concat(ContextMenu.separator)
          .concat(dom_element_common_items);
          break;

        case "value":
          return [
            {
              label: ui_strings.M_CONTEXTMENU_EDIT_ATTRIBUTE_VALUE,
              handler: contextmenu_edit_dom
            },
            {
              label: ui_strings.M_CONTEXTMENU_ADD_ATTRIBUTE,
              handler: contextmenu_add_attribute
            }
          ]
          .concat(ContextMenu.separator)
          .concat(dom_element_common_items);
          break;

        case "text":
          return [
            {
              label: ui_strings.M_CONTEXTMENU_EDIT_TEXT,
              handler: contextmenu_edit_dom
            }
          ];
          break;
        }
      }
    }
  ]);

  function contextmenu_edit_dom(event, target)
  {
    key_identifier.setView(event);
    window.actions['dom'].editDOM(event, event.target);
  }

  function contextmenu_edit_markup(event, target)
  {
    key_identifier.setView(event);
    target = event.target;
    while (target.nodeName.toLowerCase() != "node")
    {
      target = target.parentNode;
    }
    window.actions['dom'].editDOM(event, target);
  }

  function contextmenu_add_attribute(event, target)
  {
    key_identifier.setView(event);
    window.actions['dom'].insert_attribute_edit(event, event.target);
  }

  function contextmenu_remove_node(event, target)
  {
    var ele = event.target.has_attr("parent-node-chain", "ref-id");
    var rt_id = parseInt(ele.get_attr("parent-node-chain", "rt-id"));
    var ref_id = parseInt(ele.get_attr("parent-node-chain", "ref-id"));
    var tag = !settings.dom.get("update-on-dom-node-inserted")
            ? tag_manager.set_callback(this, function() {
                window.dom_data._dom_node_removed_handler({"object_id": ref_id, "runtime_id": rt_id});
              })
            : null;
    services['ecmascript-debugger'].requestEval(tag, [rt_id, 0, 0, "el.parentNode.removeChild(el)", [["el", ref_id]]]);
  }

  new Switches
  (
    'dom',
    [
      'find-with-click',
      'highlight-on-hover',
      'update-on-dom-node-inserted'
    ]
  );

  var textSearch = new TextSearch();

  var onViewCreated = function(msg)
  {
    if( msg.id == 'dom' )
    {
      textSearch.setContainer(msg.container);
      textSearch.setFormInput(views.dom.getToolbarControl( msg.container, 'dom-text-search'));
    }
  }

  var onViewDestroyed = function(msg)
  {
    if( msg.id == 'dom' )
    {
      textSearch.cleanup();
    }
  }

  var onActionModeChanged = function(msg)
  {
    if( msg.id == 'dom' && msg.mode == 'default' )
    {
      textSearch.revalidateSearch();
    }
  }

  messages.addListener('view-created', onViewCreated);
  messages.addListener('view-destroyed', onViewDestroyed);
  messages.addListener('action-mode-changed', onActionModeChanged);

  eventHandlers.input['dom-text-search'] = function(event, target)
  {
    textSearch.searchDelayed(target.value);
  }

  eventHandlers.keypress['dom-text-search'] = function(event, target)
  {
    if( event.keyCode == 13 )
    {
      textSearch.highlight();
    }
  }

};
