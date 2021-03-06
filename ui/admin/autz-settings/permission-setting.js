importResource("/admin/css/common.css");

importMiniui(function () {
    mini.parse();

    require(["request", "message", "miniui-tools"], function (request, message, tools) {
        var settingFor = request.getParameter("settingFor");
        var type = request.getParameter("type");
        var permissionType = request.getParameter("permissionType");
        var priority = request.getParameter("priority") || 0;
        var merge = request.getParameter("merge") || true;
        var permission = request.getParameter("permission");
        var dimensionType = request.getParameter("dimensionType");
        var dimensionTypeName = request.getParameter("dimensionTypeName");
        var dimension = request.getParameter("dimension");
        var dimensionName = request.getParameter("dimensionName");

        window.init=function (param) {
            permissionType = param.permissionType||permissionType;
            dimensionTypeName = param.dimensionTypeName||dimensionTypeName;
            dimension = param.dimension||dimension;
            dimensionName = param.dimensionName||dimensionName;
            permission = param.permission||permission;
            doInit();
        };


        var allPermission = [];
        var allPermissionMap = {};
        var setting = {};

        var settingDetailMap = {};
        var permissionTree = mini.get('permission-tree');

        loadPermission(doInit);
        function doInit(call) {

            if (permission) {
                //如果是通过权限界面加载，只展示对应权限菜单
                allPermission = $(allPermission).filter(function () {
                        return permission === this.id;
                    });
                }
                permissionTree.setData(mini.clone(allPermission));
                 $("#permission-container").html("")
                $(allPermission).each(function () {
                    var panel = createContainer(this);
                    $("#permission-container").append(panel);
                    allPermissionMap[this.id] = this;
                });
                mini.parse();

                $(allPermission).each(function () {
                    var permission = this;
                    mini.get(permission.id).setData(permission.actions);
                    initDataAccessEditor(this);
                });
                loadSetting(function () {

                    $(setting).each(function () {
                        settingDetailMap[this.permission] = this;

                        if (this.actions) {
                            var actions = this.actions.join(",");
                            var list = mini.get(this.permission);
                            if (list) {

                                list.setValue(actions);
                                mini.get("panel-" + this.permission).expand()
                            }
                        }

                    });
                    if (permission) {
                        goPermission(permission)
                    }
                    if(call){call()}
                });

                bindDataAccessEvent();

        }
        var current;
        permissionTree.on("nodeclick", function (e) {
            var id = e.node.id;
            if (current === id) {
                return;
            }
            current = id;
            goPermission(id);

        });

        function goPermission(id) {
            var box = mini.get("panel-" + id);
            if (!box) {
                return;
            }
            var panel = $(box.getEl());
            var container = $("#permission-container");
            box.expand();
            if (panel.position().top === 0) {
                return;
            }

            container.animate({
                scrollTop: panel.offset().top - container.offset().top + container.scrollTop()
            }, 500);
        }

        function bindDataAccessEvent() {
            $(".field-access").on('click', function () {
                var id = $(this).attr("permission");
                if (id) {
                    doEditFieldAccess(id)
                }
            });

            $(".data-access").on('click', function () {
                var id = $(this).attr("permission");
                if (id) {
                    doEditDataAccess(id);
                }
            })
        }

        function doEditFieldAccess(id) {
            var container = $("#field-access-container").html("");
            var win = mini.get('fieldWindow');
            win.show();
            var permission = allPermissionMap[id];

            win.setTitle(permission.name + "-" + "字段权限")
            var actions = permission.actions;

            var boxData = [];
            $(actions).each(function () {
                if (this.properties && this.properties.supportDataAccess) {
                    if (this.properties.supportDataAccess.split(",").indexOf('DENY_FIELDS') !== -1) {
                        boxData.push({id: this.action, text: this.describe});
                    }
                }
            });

            $(permission.optionalFields).each(function () {
                var field = this;
                var group = $("<div class='field-access-group'>");
                var title = $("<div class='field-access-title'>")
                    .text(field.describe || field.name);
                var box = $("<input class='mini-checkboxlist'>")
                    .attr({
                        id: "field-access-" + field.name
                    });

                var list = $("<div class='field-access-list'>").append(box);

                group.append(title)
                    .append(list).appendTo(container);

            });
            mini.parse();
            $(permission.optionalFields).each(function () {
                var field = this;
                var box = mini.get("field-access-" + field.name);
                box.setData(boxData);
                box.selectAll();
            });
            var detail = settingDetailMap[id] || (settingDetailMap[id] = {
                permissionId: id,
                merge: merge,
                priority: priority
            });
            var notDenyFields = [];

            $(detail.dataAccesses)
                .each(function () {
                    var action = this.action;
                    if (this.type === 'DENY_FIELDS') {
                        var fields = JSON.parse(this.config).fields;
                        $(fields).each(function () {
                            var box = mini.get("field-access-" + this);
                            box.deselect(action);
                        });

                    } else {
                        notDenyFields.push(this);
                    }
                });

            /***********************字段权限保存*****************************/
            $(".save-field-access")
                .unbind("click")
                .bind("click", function () {
                    var groups = {};
                    $(permission.optionalFields).each(function () {
                        var field = this;
                        var box = mini.get("field-access-" + field.name);
                        var val = box.getValue();
                        if (!val) {
                            val = [];
                        } else {
                            val = val.split(",");
                        }
                        if (val.length !== boxData.length) {
                            //禁用了字段
                            $(boxData).each(function () {
                                if (val.indexOf(this.id) === -1) {
                                    var fields = groups[this.id] ||
                                        (groups[this.id] =
                                            {
                                                action: this.id,
                                                type: "DENY_FIELDS",
                                                describe: "不能操作字段",
                                                config: {fields: []}

                                            });
                                    fields.config.fields.push(field.name);
                                }
                            });
                        }
                    });
                    for (var i in groups) {
                        var conf = groups[i];
                        conf.config = JSON.stringify(conf.config);
                        notDenyFields.push(conf);
                    }
                    detail.dataAccesses = notDenyFields;
                    win.hide()
                })

        }

        $(".data-access-title span").on('click', function () {
            var me = $(this);
            var pre = me.prev();
            pre.prop("checked", !pre.prop("checked"));
        });
        $(".close-button").on("click", function () {
            if(window.onClose){
                window.onClose()
            }
            tools.closeWindow()
        });

        function doEditDataAccess(id) {
            var win = mini.get('dataAccessWindow');

            win.show();
            $(".data-access-group").hide();
            var permission = allPermissionMap[id];
            win.setTitle(permission.name + "-" + "数据权限");
            var actionPermissionGroup = {};
            $(permission.actions).each(function () {
                var action = this;
                if (this.properties && this.properties.supportDataAccess) {
                    var list = this.properties.supportDataAccess.split(",");
                    $(list).each(function () {
                        var act = actionPermissionGroup[this] || (actionPermissionGroup[this] = []);
                        act.push({id: action.action, text: action.describe});
                    })
                }
            });

            $(permission.supportDataAccessTypes).each(function () {
                $("." + this).show();
                var id = this + "";
                var box = mini.get(id);
                var lst = actionPermissionGroup[id];
                if (box && lst) {
                    box.setData(mini.clone(lst));
                    //box.selectAll()
                }
            });
            var detail = settingDetailMap[id];
            var notDenyFields = [];

            $(detail.dataAccesses)
                .each(function () {
                    var action = this.action;
                    if (this.type === 'SCOPE_BY_USER') {
                        var box = mini.get(JSON.parse(this.config).scopeType);
                        if (box) {
                            box.select(action);
                        }
                    } else {
                        notDenyFields.push(this);
                    }
                });
            /***********************数据权限保存*****************************/
            $(".save-data-access")
                .unbind("click")
                .on("click", function () {

                    $(permission.supportDataAccessTypes).each(function () {
                        var id = this + "";
                        var box = mini.get(id);
                        if (box) {
                            var val = box.getValue();
                            if (!val) {
                                val = [];
                            } else {
                                val = val.split(",");
                            }
                            $(val).each(function () {
                                notDenyFields.push({
                                    type: "SCOPE_BY_USER",
                                    action: this + '',
                                    config: JSON.stringify({
                                        scopeType: id,
                                        children: true
                                    })
                                })
                            })
                        }
                    });
                    detail.dataAccesses = notDenyFields;
                    mini.get('dataAccessWindow').hide()

                })

        }

        function readPermissionActions() {

            $(allPermission)
                .each(function () {
                    var permissionId = this.id;
                    var list = mini.get(permissionId).getValue();

                    var detail = settingDetailMap[permissionId] || (function () {
                        return settingDetailMap[permissionId] = {
                            permissionId: permissionId,
                            merge: merge,
                            priority: priority
                        };
                    }());

                    if (!list) {
                        detail.status = -100;
                    }

                    detail.actions = list.split(",");

                })
        }

        $(".save-button").on('click', function () {
            readPermissionActions();

            var loading = message.loading("保存中...");
            var settings = [];
            // var setting = {};
            // setting.permission = permission;
            // setting.dimensionType = dimensionType;
            // setting.dimensionTypeName = dimensionTypeName;
            // setting.dimensionTarget = dimension;
            // setting.dimensionTargetName = dimensionName;
            // setting.settingFor = settingFor;
            // setting.type = type;
            // setting.details = [];

            for (var i in settingDetailMap) {
                var setting = {};
                if (permission) {
                    setting.permission = permission;
                } else {
                    setting.permission = settingDetailMap[i].permissionId || settingDetailMap[i].permission;
                }
                setting.dimensionType = dimensionType;
                setting.dimensionTypeName = dimensionTypeName;
                setting.dimensionTarget = dimension;
                setting.dimensionTargetName = dimensionName;
                setting.state = 1;
                setting.actions = settingDetailMap[i].actions;
                setting.id = settingDetailMap[i].id;
                setting.merge = true;
                settings.push(setting);

            }
            request.patch("autz-setting", settings, function (resp) {
                if (resp.status === 200) {
                    message.showTips("保存成功");
                    loadSetting(function(){
                        loading.hide();
                    });
                } else {
                    loading.hide();
                    message.showTips("保存失败", "danger");
                }
            });

        });

        function initDataAccessEditor(permission) {
            var panel = mini.get('panel-' + permission.id);
            var buttons = [];
            if (panel) {
                var field = false;
                if (!permission.supportDataAccessTypes) {
                    return;
                }
                if (permission.supportDataAccessTypes.indexOf('DENY_FIELDS') !== -1) {
                    buttons.push({html: '<a class="panel-button field-access" permission="' + permission.id + '" href="javascript:void(0)" style="position:relative;top:-4px;">字段权限</a>'});
                    field = true;
                }
                if (permission.supportDataAccessTypes.length > 0 && !(
                    permission.supportDataAccessTypes.length === 1 && field
                )) {
                    buttons.push({html: '<a class="panel-button data-access" permission="' + permission.id + '"  href="javascript:void(0)" style="position:relative;top:-4px;">数据权限</a>'})
                }
                panel.setButtons(buttons);
            }

        }

        function loadSetting(call) {

            var data = {};
            if (permission && permission !== "") {
                data.permission = permission;
            }
            if (dimension) data.dimensionTarget = dimension;
            var param = request.encodeQueryParam(data);
            request.get("autz-setting/_query/no-paging", param, function (resp) {
                if (resp.status === 200) {
                    setting = resp.result || {};
                    call();
                }
            })
        }

        function loadPermission(call) {
            request.createQuery("permission/_query/no-paging")
                .where()
                .exec(function (resp) {
                    if (resp.status === 200) {
                        if (!permissionType) {
                            allPermission = resp.result;
                        } else {
                            var _type = permissionType.split(",");
                            $(resp.result)
                                .each(function () {
                                    var permission = this;
                                    if (permission.type) {
                                        var matched = false;
                                        $(permission.type.split(","))
                                            .each(function () {
                                                if (_type.indexOf(this + "") !== -1) {
                                                    matched = true;
                                                }
                                            });
                                        if (matched) {
                                            allPermission.push(permission);
                                        }
                                    }
                                });
                        }

                        if (allPermission.length <= 6) {
                            mini.get('layout').removeRegion("east")
                        }
                        call();
                    } else {
                        message.showTips("加载权限失败", "danger")
                    }
                })
        }

        function createContainer(permission) {

            var panel = $("<div>")
                .attr({
                    "id": "panel-" + permission.id,
                    "title": permission.name,
                    "showCollapseButton": "true",
                    "expanded": false,
                    // "showToolbar":true,
                    "collapseOnTitleClick": "true"
                })
                .css({
                    "width": "100%",
                    "height": "auto"
                })
                .addClass("mini-panel");

            var actionList = $("<input>")
                .addClass("mini-checkboxlist")
                .attr({
                    id: permission.id,
                    repeatItems: 4,
                    repeatLayout: "table",
                    textField: "describe",
                    valueField: "action",
                    idField: "action"
                });

            panel.append(actionList);

            return panel;
        }

        if(window.onInit){
            window.onInit();
        }
    });

});