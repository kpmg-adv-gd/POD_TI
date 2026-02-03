sap.ui.define([
    'jquery.sap.global',
	"sap/ui/model/json/JSONModel",
    "./BaseController",
    "../utilities/CommonCallManager",
    "./popup/InfoTerzoLivelloPopup",
    "./popup/defects/OpenDefectPopup",
    "./popup/MarkingPopup",
], function (jQuery, JSONModel, BaseController, CommonCallManager, InfoTerzoLivelloPopup, OpenDefectPopup, MarkingPopup) {
    "use strict";

    return BaseController.extend("kpmg.custom.pod.PODTI.PODTI.controller.SecondoLivello", {
        SecondoLivello: new JSONModel(),
        customDataWCModel: new JSONModel(),
        InfoTerzoLivelloPopup: new InfoTerzoLivelloPopup(),
        OpenDefectPopup: new OpenDefectPopup(),
        MarkingPopup: new MarkingPopup(),
        onInit: function () {
            this.getView().setModel(this.SecondoLivello, "SecondoLivelloModel");
            this.getView().setModel(this.customDataWCModel, "customDataWCModel");
            this.treeTable = this.getView().byId("treeTableSecondoLivello");
            
            // Pulizia secondo livello
            sap.ui.getCore().getEventBus().subscribe("SecondoLivello", "clearSecondoLivello", this.clearSecondoLivello, this);
            // Aggiornamento secondo livello, chiamato al click su una operazione di primo livello
            sap.ui.getCore().getEventBus().subscribe("SecondoLivello", "loadSecondoLivelloModel", this.loadSecondoLivelloModel, this);
            // pulizia Machine Type
            sap.ui.getCore().getEventBus().subscribe("SecondoLivello", "clearMachineType", this.clearMachineType, this);

            // Start - Complete - Nonconformances
            sap.ui.getCore().getEventBus().subscribe("SecondoLivello", "onStartOperationPress", this.onStartOperationPress, this);
            sap.ui.getCore().getEventBus().subscribe("SecondoLivello", "onCompleteOperationPress", this.onCompleteOperationPress, this);
            sap.ui.getCore().getEventBus().subscribe("SecondoLivello", "onNonconformancePress", this.onNonconformancePress, this);

        },
        onNavigateTo: function(){
            var that = this;
        },
        onAfterRendering: function(){
            var that=this;
            if (that.getInfoModel().getProperty("/selectedPrimoLivello")) {
                that.loadSecondoLivelloModel(undefined, undefined, {collapse: true});
            }else{
                that.getView().getModel("SecondoLivelloModel").setProperty("/operations", []);
            }
        },
        clearMachineType: function () {
			this.getView().byId("machineTypeId").setSelectedKey("");
        },

        // Gestisco cambio di Machine Type
        onChangeMachineType: function () {
            var that = this;
            if (that.getInfoModel().getProperty("/selectedPrimoLivello")) {
                that.loadSecondoLivelloModel(undefined, undefined, {collapse: false});
            }else{
                that.getView().getModel("SecondoLivelloModel").setProperty("/operations", []);
            }  
        },
        // Carico dati di secondo e terzo livello (genero treeTable)
        loadSecondoLivelloModel: function(sChannel, sEvent, jsonCollapse){
            var that=this;
            that.getView().getModel("customDataWCModel").setProperty("/workcenter", that.getInfoModel().getProperty("/selectedSFC/workcenter_lev_2"));
            
            var primoLivello = that.getInfoModel().getProperty("/selectedPrimoLivello");
            if (primoLivello == undefined) {
			    that.getView().byId("machineTypeId").setSelectedKey("");
                that.getView().getModel("SecondoLivelloModel").setProperty("/operations", []);
                return;
            }
            var machineType = that.getView().byId("machineTypeId").getValue();

            var SecondoLivelloList = [];
            primoLivello.SecondoLivello.forEach(item => {
                try {
                    // Valorizzare "child" con i soli campi che voglio vedere nel terzo livello
                    var childFilter = false;
                    if (item.id_lev_3 && (!machineType || item.machine_type_3 == machineType)) {
                        var child = {
                            level: 3, 
                            sfc: item.sfc,
                            parent_id_lev_2: item.id_lev_2,
                            wbe: item.wbe,
                            parent_lev_2: item.lev_2,
                            id_lev_3: item.id_lev_3,
                            macroAttivita: item.lev_3,
                            workcenter: "",
                            parent_workcenter: item.workcenter_lev_2,
                            safety: "",
                            nonconformances: item.nonconformances,
                            mark: false,
                            info: true,
                            status: item.status_lev_3,
                            machine_type: item.machine_type_3
                        };
                        childFilter = true;
                    }
                    if (SecondoLivelloList.filter(lev => item.id_lev_2 == lev.id_lev_2).length > 0 && childFilter) {
                        SecondoLivelloList.filter(lev => item.id_lev_2 == lev.id_lev_2)[0].Children.push(child);
                    } else if (SecondoLivelloList.filter(lev => item.id_lev_2 == lev.id_lev_2).length == 0 && (!machineType || item.machine_type_3 == machineType)) {
                        // Valorizzare fuori da "Children" i soli campi che voglio vedere nel secondo livello
                        SecondoLivelloList.push({
                                level: 2,
                                sfc: item.sfc,
                                id_lev_2: item.id_lev_2,
                                macroAttivita: item.lev_2,
                                workcenter: item.workcenter_lev_2,
                                status: item.status,
                                wbe: item.wbe,
                                machine_type: item.machine_type_2,
                                safety: item.safety ? "Yes" : "No",
                                nonconformances: false,
                                mark: true,
                                info: false,
                                Children: childFilter ? [child] : []
                        })
                    }
                } catch (e) {
                    console.log("SecondoLivello ID: " + item.id +  " - Error: " + e);
                }
            });
            
            that.getInfoModel().setProperty("/selectedSecondoOrTerzoLivello",undefined);
            that.byId("treeTableSecondoLivello").clearSelection();
            that.getView().getModel("SecondoLivelloModel").setProperty("/operations", SecondoLivelloList);
            if (jsonCollapse && jsonCollapse.collapse) that.onCollapseAll();
        },
        clearSecondoLivello: function () {
            var that=this;
            that.getView().getModel("SecondoLivelloModel").setProperty("/operations", []);
            that.getInfoModel().setProperty("/selectedSecondoOrTerzoLivello",undefined);
            that.byId("treeTableSecondoLivello").clearSelection();
        },
        // Selezione riga secondo/terzo livello
        onSelectionSecondoOrTerzoLivello: function (oEvent) {
            var that=this;
            var oTable = oEvent.getSource();
            var selectedIndex = oTable.getSelectedIndex();
            //Tutte le volte in cui ho selezionato (e non deselezionato)
            if( selectedIndex !== -1 ){
                var selectedObject = oTable.getContextByIndex(selectedIndex).getObject();
                that.getInfoModel().setProperty("/selectedSecondoOrTerzoLivello",selectedObject);
            } else {
                that.getInfoModel().setProperty("/selectedSecondoOrTerzoLivello",undefined);
            }
        },

        // Pressione sul tasto Info
        onInfoOperationPress: function (oEvent) {
            var that = this;
            var selectedObject = oEvent.getSource().getBindingContext("SecondoLivelloModel").getObject();
            that.InfoTerzoLivelloPopup.open(that.getView(), that, selectedObject);
        },

        // Pressione su task Mark
        onMarkPress: function (oEvent) {
            var that = this;
            var selectedObject = oEvent.getSource().getBindingContext("SecondoLivelloModel").getObject();

            if (selectedObject.workcenter != that.getView().getModel("customDataWCModel").getProperty("/workcenter")) {
                that.showErrorMessageBox(that.getI18n("podSelection.errorMessage.noCertificationWorkcenter"));
                return;
            }

            that.getInfoModel().setProperty("/selectedOpMark",selectedObject);
            that.getMarkingEnabled(selectedObject);
        },
        getMarkingEnabled: function(markOperation){
            var that=this;
            var actualWC = that.getInfoModel().getProperty("/selectedSFC/workcenter_lev_2");
            var activeWCsString = that.getInfoModel().getProperty("/MarkingWorkCentersListEnabled");
            var activeWCsArray = activeWCsString.split(";");
            if(!activeWCsArray.includes(actualWC)){
                that.MarkingPopup.open(that.getView(), that, markOperation, false, false);
            } else{
                if(actualWC !== markOperation.workcenter){
                    that.MarkingPopup.open(that.getView(), that, markOperation, false, false);
                    that.showToast(that.getI18n("mainPOD.errorMessage.noWorkCenter.markingPopup"));
                } else{
                    that.checkCertificationMarker(markOperation);
                }
            }
        },
        checkCertificationMarker: function(markOperation){
            var that=this;

            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathAPICheckCertification = "/api/certification/v1/certifications/check";
            let url = BaseProxyURL+pathAPICheckCertification;
            
            let operation = that.getInfoModel().getProperty("/selectedPrimoLivello").operation;
            let plant = that.getInfoModel().getProperty("/plant");
            let userId = that.getInfoModel().getProperty("/user_id");

            let params = {
                plant: plant,
                operation: operation,
                userId: userId
            }

            // Callback di successo
            var successCallback = function(response) {
                if (response?.isCertificationForbidden !== undefined && response?.isCertificationForbidden) {
                    that.MarkingPopup.open(that.getView(), that, markOperation, false, false);
                    that.showToast(response?.errorMessage || "Certification Error");
                } else {
                    let markOperation=that.getInfoModel().getProperty("/selectedOpMark");
                    if(markOperation.status == "Done" || markOperation.status == "In Work" ){
                        that.MarkingPopup.open(that.getView(), that, markOperation, true, false);
                    } else {
                        that.MarkingPopup.open(that.getView(), that, markOperation, false, false);
                        that.showToast(that.getI18n("mainPOD.warningMessage.operationNoMarking"));
                    }
                }
                that.getInfoModel().setProperty("/selectedOpMark",undefined);
            };
            // Callback di errore
            var errorCallback = function(error) {
                that.getInfoModel().setProperty("/selectedOpMark",undefined);
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        // Pressione sul tasto Start e successivi check
        onStartOperationPress: function (oEvent) {
            var that = this;
            var lastLev2 = null;
            var selectedObject = that.getInfoModel().getProperty("/selectedSecondoOrTerzoLivello");

            if (!selectedObject || selectedObject.level != 3) {
                that.showErrorMessageBox("No operation has been selected.");
                return;
            }

            // Estraggo indice del mio livello 2
            var index = 0;
            for (index = 0; index < that.getView().getModel("SecondoLivelloModel").getProperty("/operations").filter(item => item.machine_type == selectedObject.machine_type).length; index++) {
                var row = that.getView().getModel("SecondoLivelloModel").getProperty("/operations")[index];
                if (row.level == 2 && row.id_lev_2 == selectedObject.parent_id_lev_2) {
                    break
                }
            }
            // Estraggo indice primo livello 2 SAFETY non completato
            var firstSafety = 0, safetyCheck = false;
            for (firstSafety = 0; firstSafety < that.getView().getModel("SecondoLivelloModel").getProperty("/operations").filter(item => item.machine_type == selectedObject.machine_type).length; firstSafety++) {
                var row = that.getView().getModel("SecondoLivelloModel").getProperty("/operations")[firstSafety];
                if (row.level == 2 && row.safety == "Yes" && row.Children.filter(item => item.status != "Done").length > 0) {
                    safetyCheck = true;
                    break;
                }
            }
            // Check safety
            if (firstSafety < index && safetyCheck) {
                that.getIfUserCertificatedForWorkcenter(selectedObject, "start", true)
            } else {
                that.getIfUserCertificatedForWorkcenter(selectedObject, "start", false)
            }

        },
        // Check sulle richieste di approvazione
        getCommentsVerbaleForApproval: function (selectedObject) {
            var that = this;
    		let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/db/getCommentsVerbaleForApproval";
            let url = BaseProxyURL+pathApi;

            let plant = that.getInfoModel().getProperty("/plant");
            var primoLivello = that.getInfoModel().getProperty("/selectedPrimoLivello")

            let params = {
                "plant": plant,
                "sfc": selectedObject.sfc,
                "id_lev_1": primoLivello.id,
                "id_lev_2": selectedObject.parent_id_lev_2,
                "id_lev_3": selectedObject.id_lev_3,
                "machine_type": selectedObject.machine_type
            };

            // Callback di successo
            var successCallback = function(response) {
                if (response.status == "NO-REQUEST" || response.status == "REJECTED") {
                    that.openPopupCommentStart(selectedObject);
                } else if (response.status == "WAITING") {
                    that.showErrorMessageBox(that.getI18n("SecondoLivello.errorMessage.waiting"));
                } else if (response.status == "APPROVED") {
                    that.startOperation(selectedObject)
                }
            };

            // Callback di errore
            var errorCallback = function(error) {
                // apertura popup automatica
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,false,true);
        },
        // Salvataggio commento pre-start operation
        saveCommentPreStartOperation: function (selectedObject, comment) {
            var that = this;
    		let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/db/saveCommentsVerbale";
            let url = BaseProxyURL+pathApi;

            let plant = that.getInfoModel().getProperty("/plant");
            var primoLivello = that.getInfoModel().getProperty("/selectedPrimoLivello")

            let params = {
                "plant": plant,
                "sfc": selectedObject.sfc,
                "wbe": selectedObject.wbe,
                "id_lev_1": primoLivello.id,
                "id_lev_2": selectedObject.parent_id_lev_2,
                "id_lev_3": selectedObject.id_lev_3,
                "machine_type": selectedObject.machine_type,
                "user": that.getInfoModel().getProperty("/user_id"),
                "comment": comment,
                "comment_type": "M",
                "status": "Waiting"
            };

            // Callback di successo
            var successCallback = function(response) {
                sap.m.MessageBox.show(response.message);
            };

            // Callback di errore
            var errorCallback = function(error) {
                // apertura popup automatica
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,false,true);
        },
        // Start operation
        startOperation: function (selectedObject) {
            var that = this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathOrderBomApi = "/db/startTerzoLivello";
            let url = BaseProxyURL+pathOrderBomApi; 
            
            var plant = that.getInfoModel().getProperty("/plant");
            var order = that.getInfoModel().getProperty("/selectedSFC/order");
            var primoLivello = that.getInfoModel().getProperty("/selectedPrimoLivello")

            let params = {
                "plant": plant,
                "sfc": selectedObject.sfc,
                "id_lev_1": primoLivello.id,
                "id_lev_2": selectedObject.parent_id_lev_2,
                "id_lev_3": selectedObject.id_lev_3,
                "machine_type": selectedObject.machine_type,
                "operation": primoLivello.operation,
                "order": order,
                "user": that.getInfoModel().getProperty("/user_id"),
            };

            // Callback di successo
            var successCallback = function(response) {
                sap.m.MessageBox.show(response.message);
                sap.ui.getCore().getEventBus().publish("PrimoLivello", "loadPODOperationsModel", {collapse: false});
            };
            // Callback di errore
            var errorCallback = function(error) {
                sap.ui.getCore().getEventBus().publish("PrimoLivello", "loadPODOperationsModel", {collapse: false});
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        // Complete operation
        onCompleteOperationPress: function (oEvent) {
            var that = this;
            var selectedObject = that.getInfoModel().getProperty("/selectedSecondoOrTerzoLivello");
            if (!selectedObject || selectedObject.level != 3) {
                that.showErrorMessageBox("No operation has been selected.");
                return;
            }
            that.getIfUserCertificatedForWorkcenter(selectedObject, "complete", false);
        },
        completeOperation: function (selectedObject) {
            var that = this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathOrderBomApi = "/db/completeTerzoLivello";
            let url = BaseProxyURL+pathOrderBomApi; 
            
            var plant = that.getInfoModel().getProperty("/plant");
            var order = that.getInfoModel().getProperty("/selectedSFC/order");
            var primoLivello = that.getInfoModel().getProperty("/selectedPrimoLivello")

            let params = {
                "plant": plant,
                "sfc": selectedObject.sfc,
                "id_lev_1": primoLivello.id,
                "id_lev_2": selectedObject.parent_id_lev_2,
                "id_lev_3": selectedObject.id_lev_3,
                "machine_type": selectedObject.machine_type,
                "operation": primoLivello.operation,
                "order": order,
                "user": that.getInfoModel().getProperty("/user_id"),
            };

            // Callback di successo
            var successCallback = function(response) {
                sap.m.MessageBox.show(response.message);
                sap.ui.getCore().getEventBus().publish("PrimoLivello", "loadPODOperationsModel", {collapse: false});
            };
            // Callback di errore
            var errorCallback = function(error) {
                // apertura popup automatica
                sap.ui.getCore().getEventBus().publish("PrimoLivello", "loadPODOperationsModel", {collapse: false});
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        // Open Defect Popup
        onNonconformancePress: function (oEvent) {
            var that = this;
            var selectedObject = that.getInfoModel().getProperty("/selectedSecondoOrTerzoLivello");
            if (!selectedObject || selectedObject.level != 3) {
                that.showErrorMessageBox("No operation has been selected.");
                return;
            }
            if (selectedObject.parent_workcenter != that.getView().getModel("customDataWCModel").getProperty("/workcenter")) {
                that.showErrorMessageBox(that.getI18n("podSelection.errorMessage.noCertificationWorkcenter"));
                return;
            }
            if (selectedObject.status != "In Work") {
                that.showErrorMessageBox(that.getI18n("podSelection.errorMessage.terzoLivelloNotInWork"));
                return;
            }
            that.OpenDefectPopup.open(that.getView(), that, selectedObject, false);
        },

        onExpandAll: function() {
            var that=this;
			var oTreeTable = this.byId("treeTableSecondoLivello");
			oTreeTable.expandToLevel(1);
			oTreeTable.expandToLevel(2);
		},
        onCollapseAll: function() {
            var that=this;
			var oTreeTable = this.byId("treeTableSecondoLivello");
			oTreeTable.collapseAll();
		},
        toggleBusyIndicator: function () {
            var that = this;
            var busyState = that.treeTable.getBusy();
            that.treeTable.setBusy(!busyState);
        },

        
        //formatter per collonna status (ICONA) front-end
        getStatusIconLev2and3: function (code) {
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
        getStatusColorLev2and3: function (code) {
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
        // check certification
        getIfUserCertificatedForWorkcenter: function (selectedObject, typeOperation, check){
           var that = this;
           if (selectedObject.parent_workcenter == that.getView().getModel("customDataWCModel").getProperty("/workcenter")) {
                if (check) that.getCommentsVerbaleForApproval(selectedObject)
                else typeOperation == "start" ? that.startOperation(selectedObject) : that.completeOperation(selectedObject)
            } else {
                that.showErrorMessageBox(that.getI18n("podSelection.errorMessage.noCertificationWorkcenter"));
            }

        },
        
        // Popup per inserire il commento per approvazione start terzo livello
        openPopupCommentStart: function (selectedObject) {
            var that = this;
            var oText = new sap.m.Text({
                text: "L'operazione che hai selezionato è bloccata da un'attività di sicurezza non eseguita!\n" +
                    "Per procedere, indica una motivazione da inviare al supervisore per l'approvazione.",
                wrapping: true
            });
            var oTextArea = new sap.m.TextArea({
                placeholder: "Insert a comment...",
                rows: 3,
                width: "100%",
                liveChange: function (oEvent) {
                    // Opzionale: Abilita/disabilita il pulsante OK in base al testo inserito
                    var sValue = oEvent.getParameter("value");
                    oDialog.getBeginButton().setEnabled(sValue.trim().length > 0);
                }
            });
            var oVBox = new sap.m.VBox({
                items: [
                    oText,
                    oTextArea
                ],
                width: "100%",
                justifyContent: "Start",
                alignItems: "Stretch",
                renderType: "Bare",
                fitContainer: true,
                class: "sapUiSmallMarginTop sapUiSmallMarginBottom sapUiContentPadding"
            });
            var oDialog = new sap.m.Dialog({
                title: "Request Start Operazione",
                type: "Message",
                contentWidth: "500px",
                content: [oVBox],
                beginButton: new sap.m.Button({
                    text: "OK",
                    type: "Emphasized",
                    enabled: false, // disabilitato finché non si scrive qualcosa
                    press: function () {
                        var sComment = oTextArea.getValue();
                        oDialog.close();
                        that.saveCommentPreStartOperation(selectedObject, sComment);
                    }
                }),
                endButton: new sap.m.Button({
                    text: "Annulla",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });
            oDialog.open();
        },

        onCellDescriptionPress: function (oEvent) {
            var oText = oEvent.getSource().getText();   // testo completo della cella
            var oSource = oEvent.getSource();           // elemento cliccato

             if (!this._oPopover) {
                this._oPopover = new sap.m.Popover({
                placement: sap.m.PlacementType.Auto,
                showHeader: false,                        // niente testata
                contentWidth: "300px",
                horizontalScrolling: false,
                verticalScrolling: true,
                content: [
                    new sap.m.Text({
                    text: "",
                    wrapping: true,                        // testo su più righe
                    class: "popoverText"                   // aggiunge padding
                    })
                ]
                });
            }

            // Set testo nel popover
            this._oPopover.getContent()[0].setText(oText);

            // Apri vicino alla cella cliccata
            this._oPopover.openBy(oSource);
        }

    });
});
