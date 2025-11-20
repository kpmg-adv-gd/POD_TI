sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../../BaseController",
    "../../../utilities/CommonCallManager",
    "../../../utilities/GenericDialog",
    "./ViewDefectPopup"
], function (JSONModel, BaseController, CommonCallManager, Dialog, ViewDefectPopup) {
    "use strict";

    return Dialog.extend("kpmg.custom.pod.PODTI.PODTI.controller.popup.defects.DefectsPopup", {
        ViewDefectPopup: new ViewDefectPopup(),

        open: function (oView, oController) {
            var that = this;
            that.DefectsModel = new JSONModel();
            that.MainPODview = oView;
            that.MainPODcontroller = oController;
            
            that._initDialog("kpmg.custom.pod.PODTI.PODTI.view.popup.defects.DefectsPopup", oView, that.DefectsModel);

            that.loadFilters();
            that.loadDefects();
            that.openDialog();
        },
        loadFilters: function(){
			var that=this;

            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/db/getFiltersDefectsTI";
            let url = BaseProxyURL+pathApi;

            let params = {
            }

            // Callback di successo
            var successCallback = function(response) {
                that.DefectsModel.setProperty("/filters", response);
                that.DefectsModel.setProperty("/filterValue", {phase: "", priority: "", status: ""});
            };

            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,false,true);
		},
        changeFilter: function () {
            var that = this;
            var filters = that.DefectsModel.getProperty("/filterValue");
            var defects = that.DefectsModel.getProperty("/defectsNoFilter");
            var defectsFiltred = [];
            for (var i = 0; i < defects.length; i++) {
                var def = defects[i];
                var children = [];
                for (var ch = 0; ch < def.Children.length; ch++) {
                    var child = def.Children[ch];
                    if ((!filters.phase || filters.phase == "" || filters.phase == child.phase) &&
                        (!filters.priority || filters.priority == "" || filters.priority == child.priority) &&
                        (!filters.status || filters.status == "" || filters.status == child.status)) {
                        children.push(child);
                    }
                }
                if (children.length > 0) {
                    defectsFiltred.push({     
                        level: 1,
                        groupOrCode: def.groupOrCode,
                        Children: children
                    })
                }
            }
            that.DefectsModel.setProperty("/defects", defectsFiltred);
        },
        loadDefects: function(){
			var that=this;

            let infoModel = that.MainPODcontroller.getInfoModel();
            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/db/getDefectsTI";
            let url = BaseProxyURL+pathApi;

            var plant = infoModel.getProperty("/plant");
            var project = infoModel.getProperty("/selectedSFC/project");

            let params = {
                "plant": plant,
                "project": project
            }
            // Callback di successo
            var successCallback = function(response) {
                that.DefectsModel.setProperty("/defectsNoFilter", response);
                that.DefectsModel.setProperty("/defects", response);
                that.DefectsModel.setProperty("/BusyLoadingOpTable", false);
            };

            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
                that.DefectsModel.setProperty("/BusyLoadingOpTable", false);
            };
            
            that.DefectsModel.setProperty("/BusyLoadingOpTable", true);
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,false,true);
		},
        onClosePress: function(oEvent) {
            var that = this;
            sap.m.MessageBox.show(
                that.MainPODcontroller.getI18n("defect.warning.closeDefect"), // Messaggio da visualizzare
                {
                    icon: sap.m.MessageBox.Icon.WARNING, // Tipo di icona
                    title: that.MainPODcontroller.getI18n("defect.titleWarning.closeDefect") || "Warning",         // Titolo della MessageBox
                    actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL], 
                    onClose: function(oAction) {          // Callback all'interazione
                        if (oAction === "OK") {
                            that.onCloseDefect(oEvent) // Chiama il callback con il contesto corretto
                        }
                    }
                }
            );
        },
        onCloseDefect: function (oEvent) {
            var that = this;
            let defect = oEvent.getSource().getParent().getBindingContext().getObject();
            let infoModel = that.MainPODcontroller.getInfoModel();

            var plant = infoModel.getProperty("/plant");
            var sfc = infoModel.getProperty("/selectedSFC/sfc");
            var order = infoModel.getProperty("/selectedSFC/order");

            let params = {
                id: defect.id,
                plant: plant,
                comments: "",
                sfc: sfc,
                order: order,
                qnCode: defect.qn_code == "" ? null : defect.qn_code,
            };

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathOrderBomApi = "/api/nonconformance/v1/close";
            let url = BaseProxyURL+pathOrderBomApi; 

            // Callback di successo
            var successCallback = function(response) {
                that.MainPODcontroller.showToast(that.MainPODcontroller.getI18n("defect.close.success.message"));
                that.loadDefects();
            };
            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
                that.showErrorMessageBox(that.MainPODcontroller.getI18n("defect.close.error.message"));
            };
            
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, true);
        },
        onInfoDefectPress: function (oEvent) {
            var that = this;
            let defect = oEvent.getSource().getParent().getBindingContext().getObject();
            that.ViewDefectPopup.open(that.MainPODview, that.MainPODcontroller, defect);
        },
        onClosePopup: function () {
            var that = this;
            that.closeDialog();
        }
    })
})
