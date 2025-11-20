sap.ui.define([
    'jquery.sap.global',
	"sap/ui/model/json/JSONModel",
    "./BaseController",
    "../utilities/CommonCallManager",
    "./popup/SinotticoPopup",
    "./popup/defects/DefectsPopup",
    "./popup/AdditionalOperationsPopup",
    "./popup/EngChangesPopup",
    "./popup/WorkInstructionsPopup"
], function (jQuery, JSONModel, BaseController, CommonCallManager, SinotticoPopup, DefectsPopup, AdditionalOperationsPopup, EngChangesPopup, WorkInstructionsPopup) {
    "use strict";

    return BaseController.extend("kpmg.custom.pod.PODTI.PODTI.controller.MainPOD", {
        oPODSfcModel: new JSONModel(),
        oPODOperationModel: new JSONModel(),
        SinotticoPopup: new SinotticoPopup(),
        DefectsPopup: new DefectsPopup(),
        AdditionalOperationsPopup: new AdditionalOperationsPopup(),
        EngChangesPopup: new EngChangesPopup(),
        WorkInstructionsPopup: new WorkInstructionsPopup(),

        onInit: function () {
            this.getView().setModel(this.oPODSfcModel, "PODSfcModel");
            this.getView().setModel(this.oPODOperationModel, "PODOperationModel");
            this.getInfoModel().setProperty("/selectedPrimoLivello", undefined);

            
            // Aggiornamento operazioni
            sap.ui.getCore().getEventBus().subscribe("PrimoLivello", "loadPODOperationsModel", this.loadPODOperationsModelAndLev2, this);
        },

        onAfterRendering: function(){
            var that=this;
        },
        onNavigateTo: function() {
            var that=this;
            that.loadSFCModel();
            that.loadPODOperationsModel();
            sap.ui.getCore().getEventBus().publish("SecondoLivello", "clearSecondoLivello", null);
        },
        loadSFCModel: function(){
            var that=this;
            var selectedSFC = that.getInfoModel().getProperty("/selectedSFC");
            that.getView().getModel("PODSfcModel").setProperty("/",selectedSFC);
        },
        // Carico tab sx - Operazioni
        loadPODOperationsModel: function(){
            var that=this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathAPIPodOperationTable = "/api/getPodOperationsTI";
            let url = BaseProxyURL+pathAPIPodOperationTable;

            let sfc = that.getView().getModel("PODSfcModel").getProperty("/sfc");
            let order = that.getView().getModel("PODSfcModel").getProperty("/order");
            let plant = that.getInfoModel().getProperty("/plant");
            that.getView().getModel("PODOperationModel").setProperty("/BusyLoadingOpTable",true);

            let params = {
                plant: plant,
                sfc: sfc,
                order: order,
            }

            // Callback di successo
            var successCallback = function(response) {
                that.getView().getModel("PODOperationModel").setProperty("/operations",response.result);
                that.getView().getModel("PODOperationModel").setProperty("/BusyLoadingOpTable",false);
            };
            // Callback di errore
            var errorCallback = function(error) {
                that.getView().getModel("PODOperationModel").setProperty("/BusyLoadingOpTable",false);
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        loadPODOperationsModelAndLev2: function (jsonCollapse) {
            var that=this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathAPIPodOperationTable = "/api/getPodOperationsTI";
            let url = BaseProxyURL+pathAPIPodOperationTable;

            let sfc = that.getView().getModel("PODSfcModel").getProperty("/sfc");
            let order = that.getView().getModel("PODSfcModel").getProperty("/order");
            let plant = that.getInfoModel().getProperty("/plant");
            that.getView().getModel("PODOperationModel").setProperty("/BusyLoadingOpTable",true);

            let params = {
                plant: plant,
                order: order,
                sfc: sfc
            }

            // Callback di successo
            var successCallback = function(response) {
                that.getView().getModel("PODOperationModel").setProperty("/operations",response.result);
                that.onSelectionPrimoLivello(undefined, jsonCollapse);
                sap.ui.getCore().getEventBus().publish("SecondoLivello", "loadSecondoLivelloModel", null);
                that.getView().getModel("PODOperationModel").setProperty("/BusyLoadingOpTable",false);
            };
            // Callback di errore
            var errorCallback = function(error) {
                that.getView().getModel("PODOperationModel").setProperty("/BusyLoadingOpTable",false);
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        // Click su una operazione di primo livello
        onSelectionPrimoLivello: function (oEvent, jsonCollapse) {
            var that=this;
            var oTable = that.byId("podOperationTable");
            var selectedIndex = oTable.getSelectedIndex();
            //Tutte le volte in cui ho selezionato (e non deselezionato)
            if( selectedIndex !== -1 ){
                var selectedObject = oTable.getContextByIndex(selectedIndex).getObject();
                that.getInfoModel().setProperty("/selectedPrimoLivello",selectedObject);
                // Triggero aggiornamento tabella del secondo livello
                sap.ui.getCore().getEventBus().publish("SecondoLivello", "loadSecondoLivelloModel", 
                    oEvent ? {collapse: true} : jsonCollapse);
            } else {
                that.getInfoModel().setProperty("/selectedPrimoLivello",undefined);
            }
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

        onOpenSinottico: function(){
            var that=this;
            let order = that.getInfoModel().getProperty("/selectedSFC/order");
            that.SinotticoPopup.open(that.getView(), that, order);
        },
        onCollapse: function(){
            var that=this;
            let primarySplitter = that.getView().byId("primaryContainerSplitter");
            let primarySplitterSize = primarySplitter.getLayoutData().getSize();
            if(primarySplitterSize !== "0%"){
                primarySplitter.getLayoutData().setSize("0%");
            }

            let secondarySplitter = that.getView().byId("secondaryContainerSplitter");
            let secondarySplitterSize = secondarySplitter.getLayoutData().getSize();
            if(secondarySplitterSize !== "100%"){
                secondarySplitter.getLayoutData().setSize("100%");
            }

            that.getView().byId("collapseButtonId").setVisible(false);
            that.getView().byId("expandButtonId").setVisible(true);
        },
        onExpand: function(){
            var that=this;
            let primarySplitter = that.getView().byId("primaryContainerSplitter");
            let primarySplitterSize = primarySplitter.getLayoutData().getSize();
            if(primarySplitterSize !== "38%"){
                primarySplitter.getLayoutData().setSize("38%");
            }
            that.getView().byId("collapseButtonId").setVisible(true);
            that.getView().byId("expandButtonId").setVisible(false);
        },
        onNavBack: function () {
            var that=this;
            that.getView().getModel("PODSfcModel").setProperty("/",{});
            that.getView().getModel("PODOperationModel").setProperty("/operations",[]);
            that.navToPODSelectionView();
        },

        // Gestione pressione su Start - Complete - Nonconformances (gestiti dal SecondoLivello)
        onStartOperationPress: function () {
            sap.ui.getCore().getEventBus().publish("SecondoLivello", "onStartOperationPress", null);
        },
        onCompleteOperationPress: function () {
            sap.ui.getCore().getEventBus().publish("SecondoLivello", "onCompleteOperationPress", null);
        },
        onNonconformancePress: function () {
            sap.ui.getCore().getEventBus().publish("SecondoLivello", "onNonconformancePress", null);
        },

        // Gestione pressione sui tab
        OnNonconformancesTabPress: function () {
            var that=this;
            that.DefectsPopup.open(that.getView(), that);
        },
        OnAdditionalOperationsTabPress: function () {
            var that=this;
            that.AdditionalOperationsPopup.open(that.getView(), that);
        },
        OnModificheTabPress: function () {
            var that=this;
            that.EngChangesPopup.open(that.getView(), that);
        },
        OnWorkInstructionsTabPress: function () {
            var that=this;
            var terzoLivello = that.getInfoModel().getProperty("/selectedSecondoOrTerzoLivello");
            if (!terzoLivello || terzoLivello.level != 3) {
                that.showErrorMessageBox("No operation has been selected.");
                return;
            }
            var primoLivello = that.getInfoModel().getProperty("/selectedPrimoLivello");
            that.WorkInstructionsPopup.open(that.getView(), that, primoLivello, terzoLivello);
        }
    });
});
v