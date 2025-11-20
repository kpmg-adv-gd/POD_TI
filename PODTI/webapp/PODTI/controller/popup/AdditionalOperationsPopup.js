sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../BaseController",
    "../../utilities/CommonCallManager",
    "../../utilities/GenericDialog",
    "./defects/OpenDefectPopup",
    "./MarkingPopup",
    "./SinotticoPopup"
], function (JSONModel, BaseController, CommonCallManager, Dialog, OpenDefectPopup, MarkingPopup, SinotticoPopup) {
    "use strict";

    return Dialog.extend("kpmg.custom.pod.PODTI.PODTI.controller.popup.AdditionalOperationsPopup", {
        OpenDefectPopup: new OpenDefectPopup(),
        MarkingPopup: new MarkingPopup(),
        SinotticoPopup: new SinotticoPopup(),

        open: function (oView, oController) {
            var that = this;
            that.MainPODview = oView;
            that.MainPODcontroller = oController;
            that.AdditionalOperationsModel = new JSONModel();

            that._initDialog("kpmg.custom.pod.PODTI.PODTI.view.popup.AdditionalOperationsPopup", oView, that.AdditionalOperationsModel);

            sap.ui.getCore().getEventBus().subscribe("AdditionalOperations", "loadAdditionalOperations", this.loadOperations, this);

            that.loadOperations();
            that.openDialog();
        },
        loadFilters: function(operations){
			var that=this;

            var sections = [], materials = [{material: ""}];
            operations.forEach(item => {
                if (!sections.includes(item.section)) sections.push({section: item.section});
                if (!materials.includes(item.material)) materials.push({material: item.material});
            });
            
            that.AdditionalOperationsModel.setProperty("/filters", {
                section: sections,
                material: materials
            });
            that.AdditionalOperationsModel.setProperty("/filterValue", {sections: [], material: ""});
		},
        changeFilter: function () {
            var that = this;
            var filters = that.AdditionalOperationsModel.getProperty("/filterValue");
            var assemblyOperations = that.AdditionalOperationsModel.getProperty("/assemblyOperationsAll");
            var testingOperations = that.AdditionalOperationsModel.getProperty("/testingOperationsAll");            
            that.AdditionalOperationsModel.setProperty("/assemblyOperations", assemblyOperations.filter(item => {
                return (!filters.sections || filters.sections.length == 0 || filters.sections.includes(item.section)) && 
                (!filters.material || filters.material == "" || item.material == filters.material)
            }));
            that.AdditionalOperationsModel.setProperty("/testingOperations", testingOperations.filter(item => {
                return (!filters.sections || filters.sections.length == 0 || filters.sections.includes(item.section)) && 
                (!filters.material || filters.material == "" || item.material == filters.material)
            }));
        },
        loadOperations: function(){
			var that=this;

            let infoModel = that.MainPODcontroller.getInfoModel();
            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/db/getAdditionalOperations";
            let url = BaseProxyURL+pathApi;

            var plant = infoModel.getProperty("/plant");
            var sfc = infoModel.getProperty("/selectedSFC/sfc");
            var order = infoModel.getProperty("/selectedSFC/order");
            var project = infoModel.getProperty("/selectedSFC/project");

            let params = {
                "plant": plant,
				"sfc": sfc,
                "order": order,
                "project": project
            }
            // Callback di successo
            var successCallback = function(response) {
                that.AdditionalOperationsModel.setProperty("/assemblyOperationsAll", response.filter(item => item.phase == "Assembly"));
                that.AdditionalOperationsModel.setProperty("/testingOperationsAll", response.filter(item => item.phase == "Testing"));

                that.AdditionalOperationsModel.setProperty("/assemblyOperations", response.filter(item => item.phase == "Assembly"));
                that.AdditionalOperationsModel.setProperty("/testingOperations", response.filter(item => item.phase == "Testing"));
            that.AdditionalOperationsModel.setProperty("/BusyLoadingOpTable", false);
                that.loadFilters(response);
            };

            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            that.AdditionalOperationsModel.setProperty("/BusyLoadingOpTable", false);
            };
            
            that.AdditionalOperationsModel.setProperty("/BusyLoadingOpTable", true);
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,false,true);
		},

        onStartOperationPress: function (oEvent) {
            var that = this;
            var selectedObject = that.AdditionalOperationsModel.getProperty("/selectedOperations");
            
            if (!selectedObject) {
                that.MainPODcontroller.showErrorMessageBox("No operation has been selected.");
                return;
            }
            that.getIfUserCertificatedForWorkcenter(selectedObject, "start")
        },

        onCompleteOperationPress: function (oEvent) {
            var that = this;
            var selectedObject = that.AdditionalOperationsModel.getProperty("/selectedOperations");
            
            if (!selectedObject) {
                that.MainPODcontroller.showErrorMessageBox("No operation has been selected.");
                return;
            }
            that.getIfUserCertificatedForWorkcenter(selectedObject, "complete")
        },

        // check certification
        getIfUserCertificatedForWorkcenter: function (selectedObject, typeOperation){
            var that=this;
            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathAPIUserCertificatedWorkcenter = "/api/checkUserWorkCenterCertification";
            let url = BaseProxyURL+pathAPIUserCertificatedWorkcenter
            
            let params={
                plant: that.MainPODcontroller.getInfoModel().getProperty("/plant"),
                userId: that.MainPODcontroller.getInfoModel().getProperty("/user_id"),
                workCenter: selectedObject.workcenter
            };

            // Callback di successo
            var successCallback = function(response) {
                if(response){
                    typeOperation == "start" ? that.startOperation(selectedObject) : that.completeOperation(selectedObject)
                } else {
                    that.MainPODcontroller.showErrorMessageBox(that.getI18n("podSelection.errorMessage.noCertificationWorkcenter"));
                }
            };
            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);

        },

        // START operation
        startOperation: function (selectedObject) {
            var that = this;
            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathOrderBomApi = "/db/startAdditionalOperation";
            let url = BaseProxyURL+pathOrderBomApi; 
            
            var plant = that.MainPODcontroller.getInfoModel().getProperty("/plant");

            let params = {
                "plant": plant,
                "sfc": selectedObject.sfc,
                "operation": selectedObject.operation,
                "phase": selectedObject.phase,
            };

            // Callback di successo
            var successCallback = function(response) {
                sap.m.MessageBox.show(response.message);
                that.loadOperations();

            };
            // Callback di errore
            var errorCallback = function(error) {
                that.loadOperations();
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        // COMPLETE operation
        completeOperation: function (selectedObject) {
            var that = this;
            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathOrderBomApi = "/db/completeAdditionalOperation";
            let url = BaseProxyURL+pathOrderBomApi; 
            
            var plant = that.MainPODcontroller.getInfoModel().getProperty("/plant");

            let params = {
                "plant": plant,
                "sfc": selectedObject.sfc,
                "operation": selectedObject.operation,
                "phase": selectedObject.phase,
            };

            // Callback di successo
            var successCallback = function(response) {
                sap.m.MessageBox.show(response.message);
                that.loadOperations();

            };
            // Callback di errore
            var errorCallback = function(error) {
                that.loadOperations();
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        
        onSelectionAssemblyOperations: function (oEvent) {
            var that=this;
            var oTable = that.MainPODcontroller.byId("assemblyOperationsTable");
            var selectedIndex = oTable.getSelectedIndex();
            //Tutte le volte in cui ho selezionato (e non deselezionato)
            if( selectedIndex !== -1 ){
                that.MainPODcontroller.byId("testingOperationsTable").clearSelection();
                var selectedObject = oTable.getContextByIndex(selectedIndex).getObject();
                that.AdditionalOperationsModel.setProperty("/selectedOperations",selectedObject);
            } else {
                that.AdditionalOperationsModel.setProperty("/selectedOperations",undefined);
            }
        },
        onSelectionTestingOperations: function (oEvent) {
            var that=this;
            var oTable = that.MainPODcontroller.byId("testingOperationsTable");
            var selectedIndex = oTable.getSelectedIndex();
            //Tutte le volte in cui ho selezionato (e non deselezionato)
            if( selectedIndex !== -1 ){
                that.MainPODcontroller.byId("assemblyOperationsTable").clearSelection();
                var selectedObject = oTable.getContextByIndex(selectedIndex).getObject();
                that.AdditionalOperationsModel.setProperty("/selectedOperations",selectedObject);
            } else {
                that.AdditionalOperationsModel.setProperty("/selectedOperations",undefined);
            }
        },

        // Pressione su open Nonconformance
        onNonconformancePress: function (oEvent) {
            var that = this;
            var selectedObject = that.AdditionalOperationsModel.getProperty("/selectedOperations");
            if (!selectedObject) {
                that.MainPODcontroller.showErrorMessageBox("No operation has been selected.");
                return;
            }
            that.OpenDefectPopup.open(that.MainPODview, that.MainPODcontroller, selectedObject, true);
        },
        // Pressione Machine BOM
        onOpenSinotticoPress: function (oEvent) {
            var that=this;
            let order = that.MainPODcontroller.getInfoModel().getProperty("/selectedSFC/order");
            that.SinotticoPopup.open(that.MainPODview, that.MainPODcontroller, order);
        },

        // Pressione su task Mark
        onMarkPress: function (oEvent) {
            var that = this;
            var selectedObject = oEvent.getSource().getBindingContext().getObject();
            // todo: apertura popup di marking
            that.MainPODcontroller.getInfoModel().setProperty("/selectedOpMark",selectedObject);
            that.getMarkingEnabled(selectedObject);
        },
        getMarkingEnabled: function(markOperation){
            var that=this;
            var actualWC = that.MainPODcontroller.getInfoModel().getProperty("/selectedSFC/workcenter_lev_2");
            var activeWCsString = that.MainPODcontroller.getInfoModel().getProperty("/MarkingWorkCentersListEnabled");
            var activeWCsArray = activeWCsString.split(";");
            if(!activeWCsArray.includes(actualWC)){
                that.MarkingPopup.open(that.MainPODview, that.MainPODcontroller, markOperation, false, true);
            } else{
                if(actualWC !== markOperation.workcenter){
                    that.MarkingPopup.open(that.MainPODview, that.MainPODcontroller, markOperation, false, true);
                    that.MainPODcontroller.showToast(that.getI18n("mainPOD.errorMessage.noWorkCenter.markingPopup"));
                } else{
                    that.checkCertificationMarker(markOperation);
                }
            }
        },
        checkCertificationMarker: function(markOperation){
            var that=this;

            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathAPICheckCertification = "/api/certification/v1/certifications/check";
            let url = BaseProxyURL+pathAPICheckCertification;
            
            let operation = markOperation.operation;
            let plant = that.MainPODcontroller.getInfoModel().getProperty("/plant");
            let userId = that.MainPODcontroller.getInfoModel().getProperty("/user_id");

            let params = {
                plant: plant,
                operation: operation,
                userId: userId
            }   

            // Callback di successo
            var successCallback = function(response) {
                if (response?.isCertificationForbidden !== undefined && response?.isCertificationForbidden) {
                    that.MarkingPopup.open(that.MainPODview, that.MainPODcontroller, markOperation, false, true);
                    that.MainPODcontroller.showToast(response?.errorMessage || "Certification Error");
                } else {
                    let markOperation=that.MainPODcontroller.getInfoModel().getProperty("/selectedOpMark");
                    if(markOperation.status == "Done" || markOperation.status == "In Work" ){
                        that.MarkingPopup.open(that.MainPODview, that.MainPODcontroller, markOperation, true, true);
                    } else {
                        that.MarkingPopup.open(that.MainPODview, that.MainPODcontroller, markOperation, false, true);
                        that.MainPODcontroller.showToast(that.getI18n("mainPOD.errorMessage.operationNoMarking"));
                    }
                }
                that.MainPODcontroller.getInfoModel().setProperty("/selectedOpMark",undefined);
            };
            // Callback di errore
            var errorCallback = function(error) {
                that.MainPODcontroller.getInfoModel().setProperty("/selectedOpMark",undefined);
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        //formatter per collonna status (ICONA) front-end
        getStatusIcon: function (code) {
            switch (code) {
                case "New":
                    return "sap-icon://rhombus-milestone-2";
                case "In Work":
                    return "sap-icon://circle-task-2";
                case "Done":
                    return "sap-icon://complete";
                case "In Queue":
                    return "sap-icon://color-fill";
                default:
                    return "";
            }
        },
        getStatusColor: function (code) {
            switch (code) {
                case "New": // new
                    return "grey";
                case "In Work": // in work
                    return "green"; // Blu
                case "Done": // done
                    return "green"; // Verde
                case "In Queue":
                    return "blue"
                default:
                    return "Default"; // Colore di default
            }
        },

        onClosePopup: function () {
            var that = this;
            that.closeDialog();
        }
    })
})
