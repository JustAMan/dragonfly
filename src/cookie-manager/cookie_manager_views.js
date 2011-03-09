window.cls || (window.cls = {});
cls.CookieManager || (cls.CookieManager = {});
cls.CookieManager["1.0"] || (cls.CookieManager["1.0"] = {});

cls.CookieManager.CookieManagerViewBase = function()
{
  this.createView = function(container){};
  this.insert_add_cookie_row_after_objectref = function(objectref){};
  this.enter_edit_mode = function(objectref, event){};
  this.check_to_exit_edit_mode = function(event, target){};
  this.exit_edit_and_save = function(){};
  
  const
  MODE_DEFAULT = "default",
  MODE_EDIT = "edit"; // duplicated in cls.CookieManager["1.1"].CookieManagerView

  this._init = function(id, name, container_class, data_reference)
  {
    this.init(id, name, container_class, null, "cookiemanager-container");

    ActionHandlerInterface.apply(this);
    this._handlers["submit"] = this._submit.bind(this);
    this._handlers["cancel"] = this._cancel.bind(this);
    ActionBroker.get_instance().register_handler(this);

    this.data = data_reference;
    this._bound_update_expiry = this._update_expiry.bind(this);

    var contextmenu = ContextMenu.get_instance();
    contextmenu.register(id, [
      {
        label: ui_strings.S_LABEL_STORAGE_UPDATE,
        handler: this.data.refetch.bind(this.data)
      }
    ]);
    contextmenu.register("cookie_context", [
      {
        callback: this._create_context_menu.bind(this)
      }
    ]);

    this._tabledef = {
      groups: {
        runtime: {
          label: ui_strings.S_LABEL_COOKIE_MANAGER_GROUPER_RUNTIME,
          grouper: function(obj) {
            return obj._rt_id;
          },
          renderer: function(groupvalue, obj) {
            return window.templates.cookie_manager.runtime_group_render(obj[0]._rt_protocol, obj[0]._rt_hostname, obj[0]._rt_path);
          }
        }
      },
      column_order: ["domain", "name", "value", "path", "expires", "isSecure", "isHTTPOnly"],
      idgetter: function(res) { return res._objectref },
      columns: {
        domain: {
          label: ui_strings.S_LABEL_COOKIE_MANAGER_COOKIE_DOMAIN,
          classname: "col_domain",
          renderer: this._domain_renderer.bind(this),
          summer: function(values, groupname, getter) {
            return ["button", ui_strings.S_LABEL_COOKIE_MANAGER_ADD_COOKIE, "class", "add_cookie_button", "handler", "cookiemanager-add-cookie-row"];
          }
        },
        name: {
          label: ui_strings.S_LABEL_COOKIE_MANAGER_COOKIE_NAME,
          classname: "col_name",
          renderer: function(obj) {
            if(obj._is_runtime_placeholder)
            {
              return;
            }
            return window.templates.cookie_manager.editable_name(obj.name);
          }
        },
        value: {
          label: ui_strings.S_LABEL_COOKIE_MANAGER_COOKIE_VALUE,
          classname: "col_value",
          renderer: function(obj) {
            if(obj._is_runtime_placeholder)
            {
              return;
            }
            return window.templates.cookie_manager.editable_value(obj.value);
          }
        },
        path: {
          label:    ui_strings.S_LABEL_COOKIE_MANAGER_COOKIE_PATH,
          classname: "col_path",
          renderer: function(obj) {
            if(obj._is_runtime_placeholder)
            {
              return;
            }
            if(typeof obj.path === "string")
            {
              return window.templates.cookie_manager.editable_path(obj.path);
            }
            return window.templates.cookie_manager.unknown_value();
          }
        },
        expires: {
          label:    ui_strings.S_LABEL_COOKIE_MANAGER_COOKIE_EXPIRES,
          classname: "col_expires",
          renderer: function(obj) {
            if(obj._is_runtime_placeholder)
            {
              return;
            }
            if(typeof obj.expires === "number")
            {
              return window.templates.cookie_manager.editable_expires(obj.expires, obj._objectref);
            }
            return window.templates.cookie_manager.unknown_value();
          }
        },
        isSecure: {
          label:    window.templates.cookie_manager.wrap_ellipsis(ui_strings.S_LABEL_COOKIE_MANAGER_SECURE_CONNECTIONS_ONLY),
          classname: "col_secure",
          renderer: this._is_secure_renderer.bind(this)
        },
        isHTTPOnly: {
          label:    window.templates.cookie_manager.wrap_ellipsis(ui_strings.S_LABEL_COOKIE_MANAGER_HTTP_ONLY),
          classname: "col_httponly",
          renderer: this._is_http_only_renderer.bind(this)
        }
      }
    };
    this._sortable_table = new SortableTable(this._tabledef, null, null, "domain", "runtime", true);
    this._sortable_table.add_listener("before-render", this._before_table_render.bind(this));
    this._sortable_table.add_listener("after-render", this._after_table_render.bind(this));
    if(!this._update_expiry_interval)
    {
      this._update_expiry_interval = setInterval(this._bound_update_expiry, 15000);
    }
  };

  this.createView = function(container)
  {
    this._container = container;
    var storage_data = this.data.get_cookies();
    this._sortable_table.data = storage_data;
    this._before_table_render();
    this._table_container = container.clearAndRender(["div", this._sortable_table.render(), "class", "table_container"]);
    this._after_table_render();
    window.messages.addListener("debug-context-selected", this._clear_container.bind(this));
  };

  this._create_context_menu = function(event, row)
  {
    this.check_to_exit_edit_mode(event, row);
    while(row.nodeName !== "tr" || !row.parentNode) // todo: remove when it's fixed on menus
    {
      row = row.parentNode;
    }
    // if row has an object-id, add edit and remove options
    var objectref = row.getAttribute("data-object-id");
    if(objectref)
    {
      this.select_row(event, row);
    }
    var selection = this._table_elem.querySelectorAll(".selected");
    var selected_cookie_objects = [];
    for (var i=0, selected_node; selected_node = selection[i]; i++) {
      var sel_cookie_obj = this.data.get_cookie_by_objectref(selected_node.getAttribute("data-object-id"));
      selected_cookie_objects.push(sel_cookie_obj);
    };

    if(selected_cookie_objects.length > 0)
    {
      var options = [
        {
          label: ui_strings.S_LABEL_COOKIE_MANAGER_ADD_COOKIE,
          handler: this.insert_add_cookie_row_after_objectref.bind(this, selected_cookie_objects[0]._objectref)
        }
      ];
      if(selected_cookie_objects.length === 1)
      {
        var sel_cookie_obj = selected_cookie_objects[0];
        if(sel_cookie_obj._is_editable)
        {
          options.push(
            {
              label: ui_strings.S_LABEL_COOKIE_MANAGER_EDIT_COOKIE,
              handler: this.enter_edit_mode.bind(this, sel_cookie_obj._objectref)
            }
          );
        }
        if(sel_cookie_obj._is_removable)
        {
          options.push(
            {
              label: ui_strings.S_LABEL_COOKIE_MANAGER_REMOVE_COOKIE,
              handler: this.data.remove_cookie.bind(this.data, sel_cookie_obj._objectref, this.data.refetch)
            }
          );
        }
        // Add "Remove all from domain-and-path"
        var runtime_id = sel_cookie_obj._rt_id;
        options.push(
          {
            // todo: would like to show the protocol too, would have to use sel_cookie_obj._rt_protocol + "://" though, but only for http / https cases
            label: ui_strings.S_LABEL_COOKIE_MANAGER_REMOVE_COOKIES_OF.replace(/%s/, sel_cookie_obj._rt_hostname + sel_cookie_obj._rt_path),
            handler: this.data.remove_cookies_of_runtime.bind(this.data, runtime_id)
          }
        );
      }
      else
      {
        // multiple selection
        var removable_cookies = [];
        for (var j=0, selected_cookie_o; selected_cookie_o = selected_cookie_objects[j]; j++) {
          if(selected_cookie_o._is_removable)
          {
            removable_cookies.push(selected_cookie_o);
          }
        };
        if(removable_cookies.length === 1)
        {
          options.push(
            {
              label: ui_strings.S_LABEL_COOKIE_MANAGER_REMOVE_COOKIE,
              handler: this.data.remove_cookie.bind(this, removable_cookies[0]._objectref, this.data.refetch)
            }
          );
        }
        else
        {
          options.push(
            {
              label: ui_strings.S_LABEL_COOKIE_MANAGER_REMOVE_COOKIES,
              handler: this.data.remove_cookies.bind(this.data, removable_cookies)
            }
          );
        }
      }
      return options;
    }
  };

  this.ondestroy = function()
  {
    this._container = null;
    if(this._update_expiry_interval)
    {
      this._update_expiry_interval = clearInterval(this._update_expiry_interval);
    }
  };

  this.select_row = function(event, elem) // public just towards actions
  {
    var event = event || {};
    /**
      * unselect everything while not doing multiple selection, which is when:
      *   cmd / ctrl key is pressed OR
      *   more than 1 item is already selected && event is right-click, clicked item was already selected
      */
    var selection = this._table_elem.querySelectorAll(".selected");
    if(!( event.ctrlKey || (selection.length > 1 && event.button === 2 && elem.hasClass("selected")) ))
    {
      for (var i=0, selected_node; selected_node = selection[i]; i++) {
        selected_node.removeClass("selected");
      };
    }
    elem.addClass("selected");
  };

  this.click_add_cookie_button = function(event, target)
  {
    this.check_to_exit_edit_mode(event, target);
    // find closest runtime above button
    var row = target.parentElement.parentElement;
    var row_with_data_id = row.previousElementSibling;
    while(!row_with_data_id.getAttribute("data-object-id"))
    {
      row_with_data_id = row_with_data_id.previousElementSibling;
    }
    var objectref = row_with_data_id.getAttribute("data-object-id");
    this.insert_add_cookie_row_after_objectref(objectref);
  }

  this.insert_add_cookie_row_after_objectref = function(objectref)
  {
    this.mode = MODE_EDIT;
    if(!document.querySelector(".add_cookie_row")) // fix for adding multiple cookies at once
    {
      this._sortable_table.restore_columns(this._table_elem);
    }
    var row = document.querySelector("[data-object-id='"+objectref+"']");
    if(row)
    {
      var runtime_id = this.data.get_cookie_by_objectref(objectref)._rt_id;
      var templ = document.documentElement.render(window.templates.cookie_manager.add_cookie_row(runtime_id, this.data._rts));
      var inserted = row.parentElement.insertAfter(templ, row);
      inserted.querySelector("[name=name]").focus();
      this.select_row(null, inserted);
    }
  }

  this.enter_edit_mode = function(objectref, event)
  {
    this.mode = MODE_EDIT;
    this._sortable_table.restore_columns(this._table_elem);
    var row = document.querySelector(".sortable-table tr[data-object-id='"+objectref+"']").addClass("edit_mode");
    this.select_row(event, row);
    // Todo: focus input in clicked td if applicable
  }

  this._submit = function(event, target)
  {
    this.exit_edit_and_save();
    return false;
  }

  this._cancel = function(event, target)
  {
    this.data.refetch();
    this.mode = MODE_DEFAULT;
    return false;
  }

  this.check_to_exit_edit_mode = function(event, target)
  {
    if(document.querySelector(".edit_mode") && !target.hasClass("add_cookie_button"))
    {
      // find out if target is within some .edit_mode node. don't exit then.
      var walk_up = target;
      while(walk_up)
      {
        if(walk_up.hasClass("edit_mode"))
        {
          return;
        }
        walk_up = walk_up.parentElement;
      }
      this.exit_edit_and_save();
    }
  }

  this.exit_edit_and_save = function()
  {
    this.mode = MODE_DEFAULT;

    var edit_trs = document.querySelectorAll("tr.edit_mode");
    for (var i=0, edit_tr; edit_tr = edit_trs[i]; i++) {
      // avoid refetching multiple times when saving multiple cookies.
      var is_last_cookie_in_list = (i == edit_trs.length - 1);
      var callback_after_set_cookie = function(){};
      if(is_last_cookie_in_list)
      {
        callback_after_set_cookie = this.data.refetch;
      }

      edit_tr.removeClass("edit_mode");

      var is_secure_input    = edit_tr.querySelector("[name=is_secure]");
      var is_http_only_input = edit_tr.querySelector("[name=is_http_only]");
      var runtime_elem       = edit_tr.querySelector("[name=add_cookie_runtime]");
      var domain_input       = edit_tr.querySelector("[name=domain]");

      var name         = edit_tr.querySelector("[name=name]").value.trim();
      var value        = edit_tr.querySelector("[name=value]").value;
      var expires      = new Date(edit_tr.querySelector("[name=expires]").value || 0).getTime();
      var path         = edit_tr.querySelector("[name=path]").value.trim();
      var is_secure    = !!(is_secure_input && is_secure_input.checked);
      var is_http_only = !!(is_http_only_input && is_http_only_input.checked);
      // "runtime" is val of [select] or [input type=hidden] (no add_cookie service)
      var runtime      = runtime_elem && parseInt(runtime_elem.value.split(",")[0]);
      // "domain" is val of [input] (with add_cookie service present), or runtimes .hostname
      var domain       = domain_input && domain_input.value.trim() || runtime && this.data._rts[runtime].hostname;

      var object_id = edit_tr.getAttribute("data-object-id");
      var old_cookie;
      if(object_id)
      {
        old_cookie = this.data.get_cookie_by_objectref(object_id);
        // check if unmodified
        if(old_cookie &&
          (
            name         === old_cookie.name &&
            value        === old_cookie.value &&
            expires      === new Date(old_cookie.expires*1000).getTime() &&
            path         === old_cookie.path &&
            is_secure    === old_cookie.isSecure &&
            is_http_only === old_cookie.isHTTPOnly &&
            domain       === (old_cookie.domain || old_cookie._rt_hostname)
          )
        )
        {
          return;
        }
      }

      if(domain && name)
      {
        var new_cookie = new cls.CookieManager.Cookie({
                           domain:         domain,
                           name:           name,
                           path:           path,
                           value:          value,
                           expires:        expires,
                           isSecure:      +is_secure,
                           isHTTPOnly:    +is_http_only,
                           _rt_id:         runtime
                          }, this.data);

        if(typeof new_cookie._rt_id !== "number")
        {
          /**
            * Try to find runtime where this might end up to be able to highlight it. Using endsWith
            * makes it work for subdomains, it can get the wrong one too, but chances are good
            * and it doesnt matter too much. Todo: Improve by making a runtimes list with those that fit.
            */
          for (var id in this.data._rts) {
            // check if runtime hostname endsWith cookie-domain val
            var hostname = this.data._rts[id].hostname;
            var last_index = hostname.lastIndexOf(new_cookie.domain);
            if(last_index !== -1 && last_index + new_cookie.domain.length == hostname.length)
            {
              new_cookie._rt_id = this.data._rts[id].rt_id;
              break;
            }
          };
        }

        if(old_cookie)
        {
          // remove old_cookie, on finished add new cookie
          this.data.remove_cookie(old_cookie._objectref, this.data.set_cookie.bind(this.data, new_cookie, callback_after_set_cookie));
        }
        else
        {
          this.data.set_cookie(new_cookie, callback_after_set_cookie);
        }
      }
      else
      {
        // todo: missing required info, needs feedback in UI. will refetch and discard for now.
        callback_after_set_cookie.call(this.data);
      }
    }
  }

  this._clear_container = function()
  {
    this._container.innerHTML = "";
  }

  this._before_table_render = function(message)
  {
    var message = message || {};
    // save selection
    if(this._table_elem)
    {
      var selection = this._table_elem.querySelectorAll(".selected");
      this._restore_selection = this._restore_selection || [];
      for (var i=0, selected_node; selected_node = selection[i]; i++) {
        this._restore_selection.push(selected_node.getAttribute("data-object-id"));
      };
    }
  }

  this._after_table_render = function()
  {
    this._update_expiry();
    this._table_elem = this._table_container.firstChild;
    // restore selection
    if(this._restore_selection)
    {
      for (var i=0, objectref; objectref = this._restore_selection[i]; i++) {
        var elem = this._container.querySelector("[data-object-id='"+objectref+"']");
        if(elem)
        {
          elem.addClass("selected");
        }
      };
      this._restore_selection = null;
    }
    // add context menus per tr
    for(var i=0; i < this._table_elem.childNodes.length; i++)
    {
      this._table_elem.childNodes[i].setAttribute("data-menu", "cookie_context");
    }

    // select and dbl-click to edit
    var rows = this._container.querySelectorAll("tr[data-object-id]");
    for (var i=0, row; row = rows[i]; i++) {
      row.setAttribute("handler", "cookiemanager-row-select");
      var objectref = row.getAttribute("data-object-id");
      if(
        this.data.get_cookie_by_objectref(objectref) &&
        this.data.get_cookie_by_objectref(objectref)._is_editable
      )
      {
        row.setAttribute("edit-handler", "cookiemanager-init-edit-mode");
      }
      else
      {
        row.addClass("non-editable");
      }
    };
  }

  this._fuzzy_date = function(time_in_seconds)
  {
    var cookie_exp = new Date(time_in_seconds*1000);
    var diff_in_seconds = Math.round((cookie_exp.getTime() - new Date().getTime()) / 1000);
    var def = [
      {
        up_to_sec: 0,
        string: ui_strings.S_LABEL_COOKIE_MANAGER_COOKIE_EXPIRED
      },
      {
        up_to_sec: 60, // a minute
        string: ui_strings.COOKIE_MANAGER_SOONER_THEN_1_MINUTE
      },
      {
        up_to_sec: 60 * 60, // an hour
        string: ui_strings.COOKIE_MANAGER_IN_X_MINUTES,
        string_singular: ui_strings.COOKIE_MANAGER_IN_1_MINUTE
      },
      {
        up_to_sec: 60 * 60 * 24, // a day
        string: ui_strings.COOKIE_MANAGER_IN_X_HOURS,
        string_singular: ui_strings.COOKIE_MANAGER_IN_1_HOUR,
      },
      {
        up_to_sec: 60 * 60 * 24 * 7, // a week
        string: ui_strings.COOKIE_MANAGER_IN_X_DAYS,
        string_singular: ui_strings.COOKIE_MANAGER_TOMORROW,
      },
      {
        up_to_sec: 60 * 60 * 24 * 7 * 4.3, // a month
        string: ui_strings.COOKIE_MANAGER_IN_X_WEEKS,
        string_singular: ui_strings.COOKIE_MANAGER_IN_1_WEEK,
      },
      {
        up_to_sec: 60 * 60 * 24 * 7 * 4.3 * 12, // a year
        string: ui_strings.COOKIE_MANAGER_IN_X_MONTHS,
        string_singular: ui_strings.COOKIE_MANAGER_IN_1_MONTH,
      },
      {
        up_to_sec: Infinity,
        string: ui_strings.COOKIE_MANAGER_IN_X_YEARS,
        string_singular: ui_strings.COOKIE_MANAGER_IN_1_YEAR,
      }
    ].sort(function(a, b){ return a.up_to_sec > b.up_to_sec });

    var str = "", val = 0, i = 0;
    for (var i=0, current_def; current_def = def[i]; i++)
    {
      if(diff_in_seconds < current_def.up_to_sec)
      {
        break;
      }
    }
    var val;
    if(def[i-1] && def[i-1].up_to_sec)
    {
      val = Math.round(diff_in_seconds / def[i-1].up_to_sec);
    }

    var ret_string = current_def.string.replace(/%s/, val);
    if(val === 1 && current_def.string_singular)
    {
      ret_string = current_def.string_singular.replace(/%s/, val);
    }
    return {string: ret_string, is_disabled: !val};
  };

  this._update_expiry = function()
  {
    var items = this.data.get_cookies();
    for (var i=0, obj; obj = items[i]; i++)
    {
      var elem = document.getElementById("expires_container_"+obj._objectref);
      if(elem)
      {
        var fuzzy_date = this._fuzzy_date(obj.expires)
        elem.textContent = fuzzy_date.string;
        if(fuzzy_date.is_disabled)
        {
          // find row, add expired_cookie class
          while(elem.nodeName !== "tr" || !elem.parentNode)
          {
            elem = elem.parentNode;
          }
          if(elem.nodeName === "tr")
          {
            elem.addClass("expired_cookie");
          }
        }
      }
    }
  };

  // DEPENDEND ON SERVICE VERSION - those might get overwritten
  this._domain_renderer = function(obj)
  {
    if(obj._is_runtime_placeholder)
    {
      return;
    }
    if(obj.domain)
    {
      return window.templates.cookie_manager.editable_domain(obj._rt_id, this.data._rts, obj.domain);
    }
    return window.templates.cookie_manager.unknown_value();
  }

  this._is_secure_renderer = function(obj)
  {
    if(obj._is_runtime_placeholder)
    {
      return;
    }
    if(typeof obj.isSecure === "number")
    {
      return window.templates.cookie_manager.boolean_value(obj.isSecure);
    }
    return window.templates.cookie_manager.unknown_value();
  }

  this._is_http_only_renderer = function(obj)
  {
    if(obj._is_runtime_placeholder)
    {
      return;
    }
    if(typeof obj.isHTTPOnly === "number")
    {
      // this will depend on the service version, it gets editable with 1.1
      return window.templates.cookie_manager.boolean_value(obj.isHTTPOnly);
    }
    return window.templates.cookie_manager.unknown_value();
  }
  // END DEPENDEND ON SERVICE VERSION
};
cls.CookieManager.CookieManagerViewBase.prototype = ViewBase;

cls.CookieManager["1.0"].CookieManagerView = function(id, name, container_class, data_reference, service_version)
{
  var data = data_reference;
  if(typeof data_reference === "function")
  {
    data = new data_reference(service_version, this);
  }
  this._init(id, name, container_class, data);
}
cls.CookieManager["1.0"].CookieManagerView.prototype = new cls.CookieManager.CookieManagerViewBase();

cls.CookieManager["1.1"] || (cls.CookieManager["1.1"] = {});
cls.CookieManager["1.1"].CookieManagerView = function(id, name, container_class, data_reference, service_version)
{
  var data = data_reference;
  const MODE_EDIT = "edit";
  if(typeof data_reference === "function")
  {
    data = new data_reference(service_version, this);
  }

  this._domain_renderer = function(obj)
  {
    if(obj._is_runtime_placeholder)
    {
      return;
    }
    if(obj.domain)
    {
      return window.templates.cookie_manager.all_editable_domain(obj.domain);
    }
    return window.templates.cookie_manager.unknown_value();
  }

  this._is_secure_renderer = function(obj)
  {
    if(obj._is_runtime_placeholder)
    {
      return;
    }
    if(typeof obj.isSecure === "number")
    {
      return window.templates.cookie_manager.editable_secure(obj.isSecure);
    }
    return window.templates.cookie_manager.unknown_value();
  }

  this._is_http_only_renderer = function(obj)
  {
    if(obj._is_runtime_placeholder)
    {
      return;
    }
    if(typeof obj.isHTTPOnly === "number")
    {
      return window.templates.cookie_manager.editable_http_only(obj.isHTTPOnly);
    }
    return window.templates.cookie_manager.unknown_value();
  }

  this.insert_add_cookie_row_after_objectref = function(objectref)
  {
    this.mode = MODE_EDIT;
    if(!document.querySelector(".add_cookie_row")) // fix for adding multiple cookies at once
    {
      this._sortable_table.restore_columns(this._table_elem);
    }
    var row = document.querySelector("[data-object-id='"+objectref+"']");
    var default_domain = this.data.get_cookie_by_objectref(objectref)._rt_hostname;
    var templ = document.documentElement.render(window.templates.cookie_manager.add_cookie_row_all_editable(default_domain));
    var inserted = row.parentElement.insertAfter(templ, row);
    inserted.querySelector("[name=name]").focus();
    this.select_row(null, inserted);
  }

  this._init(id, name, container_class, data);
}
cls.CookieManager["1.1"].CookieManagerView.prototype = new cls.CookieManager.CookieManagerViewBase();