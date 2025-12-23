sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../BaseController",
    "../../utilities/CommonCallManager",
    "../../utilities/GenericDialog",
    "./MarkingModifichePopup",
], function (JSONModel, BaseController, CommonCallManager, Dialog, MarkingModifichePopup) {
    "use strict";

    return Dialog.extend("kpmg.custom.pod.PODTI.PODTI.controller.popup.EngChangesPopup", {
        MarkingModifichePopup: new MarkingModifichePopup(),

        open: function (oView, oController) {
            var that = this;
            that.MainPODview = oView;
            that.MainPODcontroller = oController;
            that.EngChangesModel = new JSONModel();

            that._initDialog("kpmg.custom.pod.PODTI.PODTI.view.popup.EngChangesPopup", oView, that.EngChangesModel);

            that.loadStatusCollection();
            that.openDialog();
        },
   
        loadStatusCollection: function(){
            var that=this;

            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathZSharedMemory = "/db/getZSharedMemory";
            let url = BaseProxyURL+pathZSharedMemory; 

            let plant = that.MainPODcontroller.getInfoModel().getProperty("/plant") || "";
            let keySharedMemory = "STATUS_MODIFICHE";

            let params={
                plant: plant,
                key: keySharedMemory
            };

            // Callback di successo
            var successCallback = function(response) {
                if(response && response.length > 0){
                    let value = JSON.parse(response[0].value);
                    let mappedJson = Object.entries(value).map(([key, value]) => ({
                        key,
                        text: value
                    }));
                    that.EngChangesModel.setProperty("/statusCollection", mappedJson);
                }
                that.loadModificheModel();
            };
            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        onStatusChange: function(oEvent){
            var that=this;
            var objStatusModified = oEvent.getSource().getBindingContext().getObject();
            var results = that.EngChangesModel.getProperty("/results");
            // recupero livello 1
            for (var mc = 0; mc < results.length; mc++) {
                if (results[mc].Children.filter(item => item.childId == objStatusModified.childId).length > 0) {
                    var parent = results[mc];
                    break;
                }
            }
            var status = objStatusModified.status;
            if(parent.type=="MT"){
                let warningMessage = that.MainPODcontroller.getI18n("modifiche.warningMessage.allModificheTecniche");
                sap.m.MessageBox.show(
                    warningMessage,  // Messaggio da visualizzare
                    sap.m.MessageBox.Icon.WARNING,      // Tipo di icona: warning
                    "Warning",                       // Titolo della MessageBox
                    [sap.m.MessageBox.Action.OK,sap.m.MessageBox.Action.CANCEL],
                    function(oAction) { // Funzione di callback
                        if (oAction === sap.m.MessageBox.Action.OK) {
                            // Se l'utente preme OK
                            that.onOpenNoteDialog(parent, objStatusModified,status);
                        } else if (oAction === sap.m.MessageBox.Action.CANCEL) {
                            that.loadStatusCollection();
                            //Se preme cancel
                        }
                    }
                );   
            } else{
                that.updateStatusModification(parent, objStatusModified,status);
            }
        },
        onOpenNoteDialog: function (parent, objStatusModified, status) {
            var that = this;
        
            var oNoteDialog = new sap.m.Dialog({
                title: "Inserisci una Nota",
                type: "Message",
                contentWidth: "500px",
                content: [
                    new sap.m.TextArea({
                        id: "noteTextArea_" + Date.now(), // ID unico se vuoi evitare conflitti
                        width: "100%",
                        placeholder: "Scrivi una nota (facoltativa)...",
                        rows: 5
                    })
                ],
                beginButton: new sap.m.Button({
                    text: "Conferma",
                    type: "Accept",
                    press: function () {
                        var note = oNoteDialog.getContent()[0].getValue(); // Accesso diretto al TextArea
                        objStatusModified.note = note;
                        that.updateStatusModification(parent, objStatusModified, status);
                        oNoteDialog.close();
                    }
                }),
                endButton: new sap.m.Button({
                    text: "Annulla",
                    type: "Reject",
                    press: function () {
                        that.loadStatusCollection();
                        oNoteDialog.close();
                    }
                }),
                afterClose: function () {
                    oNoteDialog.destroy();
                }
            });
        
            this.getView().addDependent(oNoteDialog);
            oNoteDialog.open();
        },
        updateStatusModification: function(parent, objStatusModified,status){
            
            var that=this;
            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathUpdateStatusModifica = "/api/sendAndUpdateModifiche";
            let url = BaseProxyURL+pathUpdateStatusModifica; 

            let plant = that.MainPODcontroller.getInfoModel().getProperty("/plant") || "";
            var wbe = objStatusModified.wbe;
            let process_id = parent.processId;
            let prog_eco = parent.progEco;
            let order = objStatusModified.order;
            var material = parent.material;
            var child_material = objStatusModified.childMaterial;
            var type = parent.type;
            var resolution = objStatusModified.resolution;
            var note = objStatusModified.note || "";
            

            let params={
                plant: plant,
                wbe: wbe,
                process_id: process_id,
                prog_eco: prog_eco,
                newStatus: status,
                material: material,
                order: order,
                child_material: child_material,
                type: type,
                order: objStatusModified.order,
                resolution: resolution,
                note: note
            };

            // Callback di successo
            var successCallback = function(response) {
                that.loadStatusCollection();
                that.MainPODcontroller.showToast("Stato Modificato!")
            };
            // Callback di errore
            var errorCallback = function(error) {
                that.loadModificheModel();
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,false,true);
        },

        loadModificheModel: function(){
			var that=this;

            let infoModel = that.MainPODcontroller.getInfoModel();
            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/db/getModificheToTesting";
            let url = BaseProxyURL+pathApi;

            var plant = infoModel.getProperty("/plant");
            var project = infoModel.getProperty("/selectedSFC/project");

            let params = {
                "plant": plant,
                "project": project
            }
            
            // Callback di successo
            var successCallback = function(response) {
                that.EngChangesModel.setProperty("/results", response);
                that.EngChangesModel.setProperty("/BusyLoadingOpTable", false);
            };

            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
                that.EngChangesModel.setProperty("/BusyLoadingOpTable", false);
            };
            
            that.EngChangesModel.setProperty("/BusyLoadingOpTable", true);
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,false,true);
		},

        onMarkPress: function (oEvent) {
            var that = this;
            var selectedObject = oEvent.getSource().getBindingContext().getObject();
            var results = that.EngChangesModel.getProperty("/results");
            if (selectedObject.level == 2) {
                // recupero livello 1
                for (var mc = 0; mc < results.length; mc++) {
                    if (results[mc].Children.filter(item => item.childId == selectedObject.childId).length > 0) {
                        that.MarkingModifichePopup.open(that.MainPODview, that.MainPODcontroller, results[mc], selectedObject);
                        break;
                    }
                }
            }else{
                that.MarkingModifichePopup.open(that.MainPODview, that.MainPODcontroller, selectedObject, null);
            }
        },

        onExpandAll: function () {
            const oTable = this.MainPODcontroller.byId("treeTableEngChangesPopup");
            oTable.expandToLevel(99);   // livello alto per essere sicuri
        },
        onCollapseAll: function () {
            const oTable = this.MainPODcontroller.byId("treeTableEngChangesPopup");
            oTable.collapseAll();
        },

        onClosePopup: function () {
            var that = this;
            that.closeDialog();
        }
    })
})
