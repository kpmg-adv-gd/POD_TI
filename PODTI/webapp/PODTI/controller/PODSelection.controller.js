sap.ui.define([
    'jquery.sap.global',
	"sap/ui/model/json/JSONModel",
    "./BaseController",
    "../utilities/CommonCallManager"
], function (jQuery, JSONModel, BaseController, CommonCallManager) {
	"use strict";

	return BaseController.extend("kpmg.custom.pod.PODTI.PODTI.controller.PODSelection", {
        oPODSelectionModel: new JSONModel(),

		onInit: function () {
            this.getView().setModel(this.oPODSelectionModel, "PODSelectionModel");
		},
        onAfterRendering: function(){
            var that=this;
            //Usando il Navigation entro nel onAfterRendering solo la prima volta - in questo caso non carico la tabella e non facico check sui filtri
            that.firstTimeEnterPodSelection=true;
        },
        onNavigateTo: function() {
            var that=this;
            that.populateSuggestionFilters();
            that.onGoPress();
        },
        populateSuggestionFilters: function(){
            var that=this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathAPIFilter = "/api/getFilterPODTI";
            let url = BaseProxyURL+pathAPIFilter;
            let plant = that.getInfoModel().getProperty("/plant");
            let userId = that.getInfoModel().getProperty("/user_id");
            let params = {
                "plant": plant,
                "userId": userId
            }
            // Callback di successo
            var successCallback = function(response) {
                var oFilterModel = new JSONModel(response);
                oFilterModel.setSizeLimit(10000);
                this.getView().setModel(oFilterModel,"FilterModel");
            };

            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);

        },
        onGoPress: function(){
            var that=this;
            //Controllo solo che se ho appena caricato il POD non devo restiuire dati -> non controllo il wc
            if(!that.firstTimeEnterPodSelection){
                let workcenter = that.getView().byId("workcenterComboBoxId").getSelectedKey();
                if(!workcenter){
                    that.showErrorMessageBox(that.getI18n("podSelection.errorMessage.noWorkcenter"));
                    that.getView().getModel("PODSelectionModel").setProperty("/SFCs",undefined);
                    return
                }

                that.getIfUserCertificatedForWorkcenter(workcenter);
            } else{
                that.firstTimeEnterPodSelection=false;
                that.getView().getModel("PODSelectionModel").setProperty("/SFCs",undefined);
            }
        },
        getIfUserCertificatedForWorkcenter: function(workcenter){
            var that=this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathAPIUserCertificatedWorkcenter = "/api/checkUserWorkCenterCertification";
            let url = BaseProxyURL+pathAPIUserCertificatedWorkcenter
            
            let params={
                plant: that.getInfoModel().getProperty("/plant"),
                userId: that.getInfoModel().getProperty("/user_id"),
                workCenter: workcenter
            };

            // Callback di successo
            var successCallback = function(response) {
                if(response){
                    that.getPodSelectionTableData();
                } else {
                    that.showErrorMessageBox(that.getI18n("podSelection.errorMessage.noCertificationWorkcenter"));
                }
            };
            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);

        },
        getPodSelectionTableData: function(){
            var that=this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathAPISelectionPodTable = "/db/getVerbaleLev2NotDone";
            let url = BaseProxyURL+pathAPISelectionPodTable;
            that.getView().getModel("PODSelectionModel").setProperty("/BusyLoadingOpTable",true);

            let params={
                "plant": that.getInfoModel().getProperty("/plant"),
                "workcenter": that.getView().byId("workcenterComboBoxId").getSelectedKey(),
                "project": that.getView().byId("projectInputId").getValue(),
                "customer": that.getView().byId("customerInputId").getValue(),
                "co": that.getView().byId("coInputId").getValue(),
            }

            // Callback di successo
            var successCallback = function(response) {
                that.getView().getModel("PODSelectionModel").setProperty("/SFCs",response.result);
                that.getView().getModel("PODSelectionModel").setProperty("/BusyLoadingOpTable",false);
            };
            // Callback di errore
            var errorCallback = function(error) {
                that.getView().getModel("PODSelectionModel").setProperty("/BusyLoadingOpTable",false);
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);

        },
        onClearPress: function(oEvent){
            var that = this;
            var oTable = that.getView().byId("resultTable");
            that.getView().byId("projectInputId").setValue("");
            that.getView().byId("customerInputId").setValue("");
            that.getView().byId("coInputId").setValue("");
            that.getView().byId("workcenterComboBoxId").setSelectedKey("");
            //Rimuovo filtri delle colonne della tabella
            const aColumns = oTable.getColumns();
			for (let i = 0; i < aColumns.length; i++) {
				oTable.filter(aColumns[i], null);
			}
        },
        rowSelectionChange: function(oEvent){
            var that=this;
            var oTable = oEvent.getSource();
            var selectedIndex = oTable.getSelectedIndex();
            //Tutte le volte in cui ho selezionato (e non deselezionato)
            if( selectedIndex !== -1 ){
                var selectedObject = oTable.getContextByIndex(selectedIndex).getObject();
                that.getInfoModel().setProperty("/selectedSFC",selectedObject);
                that.navToMainPODView();
            } else {
                that.getInfoModel().setProperty("/selectedSFC",undefined);
            }
        },
        //formatter per collonna status (ICONA) front-end
        getStatusIcon: function (code) {
            switch (code) {
                case "401":
                    return "sap-icon://rhombus-milestone-2";
                case "402":
                    return "sap-icon://color-fill";
                case "403":
                    return "sap-icon://circle-task-2";
                default:
                    return "";
            }
        },
        getStatusColor: function (code) {
            switch (code) {
                case "401":
                    return "grey";
                case "402":
                    return "blue"; // Blu
                case "403":
                    return "green"; // Verde
                default:
                    return "Default"; // Colore di default
            }
        }
        

	});
});