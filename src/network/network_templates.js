﻿window.templates || (window.templates = {});

(function(templates) {

const MIN_BAR_WIDTH = 22; // todo: this is 16 + 6 padding from network-graph-sections-hitarea, should be done separately
const TIMELINE_MARKER_WIDTH = 60;

templates.network_options_main = function(nocaching, tracking, headers, overrides)
{
  return ["div",
          ["div",
           ["h2", ui_strings.S_NETWORK_CACHING_SETTING_TITLE],
           ["p", ui_strings.S_NETWORK_CACHING_SETTING_DESC],
           ["p", ["label",
            ["input", "type", "checkbox",
             "name", "network-options-caching",
             "handler", "network-options-toggle-caching",
             "checked", nocaching ? true : false
            ],
            ui_strings.S_NETWORK_CACHING_SETTING_DISABLED_LABEL
           ]],
           ["h2", ui_strings.S_NETWORK_HEADER_OVERRIDES_TITLE],
           ["p", ui_strings.S_NETWORK_HEADER_OVERRIDES_DESC],
           ["p", ["label", ["input", "type", "checkbox", "handler", "toggle-header-overrides"].concat(overrides ? ["checked", "checked"] : []), ui_strings.S_NETWORK_HEADER_OVERRIDES_LABEL],
            templates.network_options_override_list(headers, overrides)
           ]
          ],
         "class", "network-options"
         ];
};

templates.network_options_override_list = function(headers, overrides)
{
  var tpl = ["_auto_height_textarea",
             headers.map(function(e) {return e.name + ": " + e.value}).join("\n"),
             "class", "header-override-input"
            ].concat(overrides ? [] : ["disabled", "disabled"]);
  return [
          ["br"],
          ui_strings.S_NETWORK_HEADER_OVERRIDES_PRESETS_LABEL + ":", templates.network_options_override_presets(overrides),
          ["br"],
          tpl,
          ["br"],
          ["span", ui_strings.S_NETWORK_HEADER_OVERRIDES_PRESETS_SAVE,
           "handler", "update-header-overrides",
           "class", "container-button ui-button",
           "tabindex", "1"
          ].concat(overrides ? [] : ["disabled", "disabled"])
         ];
};

templates.network_options_override_presets = function(overrides)
{
    return ["select",
            cls.ResourceUtil.header_presets.map(function(e) { return ["option", e.name, "value", e.headers] }),
            "handler", "network-options-select-preset"
            ].concat(overrides ? [] : ["disabled", "disabled"]);
};

templates.network_request_crafter_main = function(url, loading, request, response)
{
  // fixme: replace request in progress text with spinner or similar.
  return ["div",
          ["div",
           ["h2", ui_strings.S_HTTP_LABEL_URL],
           ["p", ["input", "type", "text",
            "value", url || "http://example.org",
            "handler", "request-crafter-url-change"]],
           ["h2", ui_strings.M_NETWORK_CRAFTER_REQUEST_BODY],
            ["p", ["_auto_height_textarea", request]],
           ["p", ["span", ui_strings.M_NETWORK_CRAFTER_SEND,
            "handler", "request-crafter-send",
            "unselectable", "on",
            "class", "container-button ui-button",
            "tabindex", "1"]],
           ["h2", ui_strings.M_NETWORK_CRAFTER_RESPONSE_BODY],
           ["p", ["textarea", loading ? ui_strings.M_NETWORK_CRAFTER_SEND : response]],
           "class", "padding request-crafter"
          ]
         ];
};

templates.network_incomplete_warning = function()
{
  return ["div",
           ["span", ui_strings.S_HTTP_INCOMPLETE_LOADING_GRAPH],
           ["div",
             ["span", ui_strings.S_MENU_RELOAD_DEBUG_CONTEXT_SHORT, "class", "text_handler", "handler", "reload-window"],
             " ",
             ["span", ui_strings.S_LABEL_DIALOG_DONT_SHOW_AGAIN, "class", "text_handler", "handler", "turn-off-incomplete-warning"]
           ],
           ["span", " ", "class", "close_incomplete_warning", "handler", "close-incomplete-warning"],
         "class", "network_incomplete_warning"];
};

templates.network_log_main = function(ctx, selected, selected_viewmode, detail_width, item_order)
{
  var viewmode_render = templates["network_viewmode_" + selected_viewmode];
  if (!viewmode_render)
    viewmode_render = templates["network_viewmode_graphs"];

  var show_incomplete_warning = settings.network_logger.get("show-incomplete-warning") &&
                                !ctx.saw_main_document_abouttoloaddocument &&
                                !ctx.incomplete_warn_discarded;

  return [
    [
      "div", templates.network_log_url_list(ctx, selected, item_order),
      "id", "network-url-list"
    ],
    [
      "div", [
        "div", viewmode_render(ctx, selected, detail_width),
        "class", "network-data-container " + selected_viewmode
      ],
      "class", "network-main-container"
    ],
    [
      "div", [
        templates.network_log_summary(ctx)
      ], "class", "network-summary"
    ],
    show_incomplete_warning ?
      templates.network_incomplete_warning() : []
  ]
};

templates.network_viewmode_graphs = function(ctx, selected, width)
{
  var basetime = ctx.get_starttime();
  var duration = ctx.get_coarse_duration(MIN_BAR_WIDTH, width);
  var rows = templates.network_graph_rows(ctx, selected, width, basetime, duration);

  var template = [];
  if (duration)
  {
    var stepsize = templates.grid_info(duration, width, (TIMELINE_MARKER_WIDTH / 2) + MIN_BAR_WIDTH);
    var gridwidth = Math.round((width / duration) * stepsize);
    var headerrow = templates.network_timeline_row(width, stepsize, gridwidth);

    template = ["div", headerrow, rows,
                  "id", "graph",
                  "style", ["background-image: -o-linear-gradient(",
                                               "0deg,",
                                               "#e5e5e5 0px,",
                                               "#e5e5e5 1px,",
                                               "transparent 1px",
                                              ");",
                           "background-position: 0 21px;",
                           "background-repeat: repeat-x;",
                           "background-size: " + gridwidth + "px 100%;"].join("")
               ];
  }
  return template;
}

templates.network_viewmode_data = function(ctx, selected, detail_width)
{
  return ["div", "class", "network-data-table-container"];
}

templates.network_log_url_list = function(ctx, selected, item_order)
{
  var ERROR_RESPONSE = "error_response";
  var NOT_REQUESTED = "not_requested";

  var itemfun = function(req)
  {
    var had_error_response = req.had_error_response;
    var not_requested = !req.touched_network;

    return ["li",
            templates.network_request_icon(req),
            ["span",
              req.filename || req.human_url,
              "data-tooltip", "network-url-list-tooltip"
            ],
            "handler", "select-network-request",
            "data-object-id", String(req.id),
            "class", (selected === req.id ? "selected " : " ") + 
                     (had_error_response ? ERROR_RESPONSE + " " : " ") + 
                     (not_requested ? NOT_REQUESTED : "")
           ];
  };

  var items = ctx.get_entries_filtered().slice(0);
  // Could use copy_object instead, because the template doesn't need the methods of the resources.
  // But it's probably more overhead to copy the whole thing then it is to just make a new array pointing
  // to the old objects
  if (item_order)
  {
    item_order = item_order.split(",");
    items.sort(function(a, b)
      {
        var ind_a = item_order.indexOf(a.id);
        var ind_b = item_order.indexOf(b.id);

        if (ind_a === ind_b)
          return 0;

        if (ind_a > ind_b)
          return 1;

        return -1;
      }
    );
  }
  return [
    ["ol", items.map(itemfun),
      "class", "network-log-url-list"]
  ]
};

templates.network_log_url_tooltip = function(entry)
{
  var UNREFERENCED = "unreferenced";
  var ERROR_RESPONSE = "error_response";
  var NOT_REQUESTED = "not_requested";

  var template = [];

  var context_string;
  var context_type;

  if (entry.unloaded)
  {
    context_string = ui_strings.S_HTTP_UNREFERENCED;
    context_type = UNREFERENCED;
  }
  else if (entry.had_error_response)
  {
    context_string = entry.responsecode + " (" + cls.ResourceUtil.http_status_codes[entry.responsecode] + ")";
    context_type = ERROR_RESPONSE;
  }
  else if (entry.no_request_made)
  {
    if (entry.urltypeName === cls.ResourceManager["1.2"].UrlLoad.URLType[3])
    {
      context_string = ui_strings.S_HTTP_SERVED_OVER_FILE;
      context_type = NOT_REQUESTED;
    }
    else if (entry.urltypeName === cls.ResourceManager["1.2"].UrlLoad.URLType[4])
    {
      // data uri, the tooltip is explicit enough in these cases
    }
    else
    {
      // otherwise just not requested, probably chached
      context_string = ui_strings.S_HTTP_NOT_REQUESTED;
      context_type = NOT_REQUESTED;
    }
  }

  if (context_string && context_type)
  {
    template.push(["span", context_string, "class", context_type]);
  }
  template.push(["span", " " + entry.human_url]);
  var uri = new URI(entry.human_url);
  if (uri.search)
  {
    var table = ["table"];
    for (var i = 0, param; param = uri.params[i]; i++)
    {
      table.push(["tr", ["td", param.key], ["td", param.value], "class", "string mono"]);
    };
    table = table.concat(["class", "network_get_params"]);    
    template.push(table);
  }
  return template;
};

templates.network_log_summary = function(ctx)
{
  var items = ctx.get_entries_filtered().slice(0);
  var total_size = items.map(function(entry){
                        return entry.size || 0
                      }).reduce(function(prev, curr){
                        return prev + curr;
                      }, 0);
  var str = items.length;
  str += str === 1 ? " " + ui_strings.S_NETWORK_REQUEST :
                     " " + ui_strings.S_NETWORK_REQUESTS;

  if (total_size)
    str += ", " + cls.ResourceUtil.bytes_to_human_readable(total_size);

  return ["div", str];
};

templates.network_request_icon = function(request)
{
  var classname = "resource-icon resource-type-" + request.type;
/*
  // todo: long lasting discussion to add some XHR indicator to the icon
  if (request.load_origin) // === "xhr"
    classname += " request-origin-" + request.load_origin;
*/
  return ["span", "class", classname];
};

templates.network_timeline_row = function(width, stepsize, gridwidth)
{
  var labels = [];
  var cnt = Math.ceil(width / gridwidth);
  var max_val = stepsize * cnt;
  var unit = [1, "ms"];
  if (max_val > 1000)
    unit = [1000, "s"];
  
  while (stepsize && --cnt >= 0)
  {
    var left_val = gridwidth * cnt - TIMELINE_MARKER_WIDTH / 2;
    var val_str = (stepsize * cnt) / unit[0];
    val_str = Math.round(val_str * 100) / 100;
    labels.push(["span", "" + val_str + unit[1],
                 "style", "left: " + left_val + "px;",
                 "class", "timeline-marker"
                 ]);
  }

  return ["div", labels, "class", "network-timeline-row"];
};

templates.network_graph_rows = function(ctx, selected, width, basetime, duration)
{
  var tpls = [];
  var entries = ctx.get_entries_filtered();

  for (var n = 0, entry; entry = entries[n]; n++)
  {
    tpls.push(templates.network_graph_row(entry, selected, width, basetime, duration));
  }
  return tpls;
};

templates.network_graph_row = function(entry, selected, width, basetime, duration)
{
  var scale = width / duration;
  var start = (entry.starttime - basetime) * scale;
  var padding_left_hitarea = 3;
  var item_container = ["span",
                        templates.network_graph_sections(entry, width, duration),
                        "class", "network-graph-sections-hitarea",
                        "data-tooltip", "network-graph-tooltip",
                        "style", "margin-left:" + (start - padding_left_hitarea) + "px;"];

  return ["div", item_container,
          "class", "network-graph-row " + (selected === entry.id ? "selected " : ""),
          "handler", "select-network-request",
          "data-object-id", String(entry.id)];
}

templates.network_graph_section_color = {
  waiting: "#a7a7f7",
  request: "#ed9696",
  receiving: "#b6e3b6",
  blocked: "#cfcfcf",
  irregular: "#b9b9b9" // todo: this used to be striped, but it's a bit diffcult now..
}

templates.network_graph_sections = function(entry, width, duration, do_tooltip)
{
  var scale = width / duration;
  var px_duration = entry.get_duration() * scale;

  return ["span",
           "class", "network-graph-sections",
           "data-tooltip", do_tooltip && "network-graph-tooltip",
           "data-object-id", String(entry.id),
           "style", "width: " + px_duration + "px;" +
                    "background-image: -o-linear-gradient(0deg," +
                      templates.network_graph_sections_style(entry, width, duration) +
                    ");"
         ];
};

templates.network_graph_sections_style = function(entry, size, duration)
{
  if (!entry.event_sequence.length)
    return "transparent 0, transparent 100%";

  var scale = size / duration;
  var to = 0;
  var gradient_vals = entry.event_sequence.map(function(section){
    var from = to;
    var val = section.val * scale;
    to += val;

    var color = templates.network_graph_section_color[section.classname];
    // todo: also add the 90deg gradient that makes it shiny
    return color + " " + Math.round(from) + "px," +  color + " " + Math.round(to) + "px";
  }).join(",");
  // End transparent. This will let the fallback background-color show in case min-width applies.
  gradient_vals += ",transparent " + Math.round(to) + "px";
  return gradient_vals;
};

templates.network_graph_entry_tooltip = function(entry)
{
  if (!entry)
    return;

  const height = 155;
  var duration = entry.get_duration();
  var scale = height / duration;
  if (duration && entry.events)
  {
    var event_rows = entry.event_sequence.map(function(stop, index, arr)
    {
      // sequences with only from_event are ommited as they only mark the start of a gap
      return ["tr",
               ["td", stop.val_string, "class", "time_data mono"],
               ["td", stop.title, "class", "gap_title"],
               ini.debug ? ["td", "(" + stop.from_event.name + " to " + stop.to_event.name + ")", "class", "gap_title"] : []
             ];
    });
    event_rows.push(["tr",
                      ["td", duration.toFixed(2) + "ms", "class", "time_data mono"],
                      ["td", ui_strings.S_HTTP_LABEL_DURATION], "class", "sum"]);

    const CHARWIDTH = 7; // todo: we probably have that around somewhere where its dynamic
    const LINEHEIGHT = 19;

    var svg_width = 100.5;
    var x_start = 1.5;
    var y_start = 0.5;
    var y_ref = 0;
    var x_end = svg_width;
    var y_end = 0;

    var pathes = entry.event_sequence.map(function(row, index, arr)
    {
      if (row.val)
      {
        var height = Math.round(row.val * scale);
        y_start = y_ref + (height / 2);
        y_ref += height;
        y_end = (index * LINEHEIGHT) + (LINEHEIGHT / 2) + 0.5;
        return(["path", "d", "M" + x_start + " " + y_start + " L" + x_end + " " + y_end, "stroke", "#BABABA"]);
      }
      return "";
    });

    var svg_height = Math.max(y_start, y_end, y_ref);

    return ["div",
      [
        ini.debug ?
          ["h2", "Requested " + entry.resource + " at " +  entry.start_time_string] : 
          ["h2", ui_strings.S_HTTP_REQUESTED_HEADLINE.replace("%s", entry.start_time_string)],
        ["div",
          ["div",
            "style", "height: " + height + "px; " +
                     "background-image: -o-linear-gradient(270deg," +
                        templates.network_graph_sections_style(entry, height, duration) +
                      ");",
            "class", "network-tooltip-graph"
          ],
          ["div",
            ["svg:svg", pathes,
              "width",  Math.ceil(svg_width) + "px",
              "height", Math.ceil(svg_height) + "px",
              "version", "1.1",
              "style", "position: absolute;"
            ], "class", "network-tooltip-pointers"],
          ["div",
            ["table", event_rows],
            "class", "network-tooltip-legend"
          ],
        "class", "network-tooltip-row"]
      ], "class", "network-tooltip-container"
    ];
  }
}


templates.grid_info = function(duration, width, padding)
{
  if (duration > 0)
  {
    var draw_line_every = 150; // px
    var draw_lines = Math.round(width / draw_line_every);
    
    var value = oldval = Number((duration / draw_lines).toPrecision(1)); // what this returns is the duration of one section
    var val_in_px = width / duration * Number(value);

    // if the last line comes too close to the edge, decrease the value until it fits.
    // need to modify the actual ms value to keep it nice labels on the result,
    // at least while it gets shown in ms
    while (width % (val_in_px * draw_lines) < padding)
    {
      value--;
      val_in_px = width / duration * value;
    }

    return value;
  }
}

})(window.templates);