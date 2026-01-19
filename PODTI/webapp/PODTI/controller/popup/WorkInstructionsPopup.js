sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../BaseController",
    "../../utilities/CommonCallManager",
    "../../utilities/GenericDialog",
], function (JSONModel, BaseController, CommonCallManager, Dialog) {
    "use strict";

    return Dialog.extend("kpmg.custom.pod.PODTI.PODTI.controller.popup.WorkInstructionsPopup", {

        open: function (oView, oController, primoLivello, terzoLivello) {
            var that = this;
            that.MainPODview = oView;
            that.MainPODcontroller = oController;
            that.primoLivello = primoLivello;
            that.terzoLivello = terzoLivello;
            that.WorkInstructionsModel = new JSONModel();

            that._initDialog("kpmg.custom.pod.PODTI.PODTI.view.popup.WorkInstructionsPopup", oView, that.WorkInstructionsModel);

            that.loadWorkInstructions();
            that.openDialog();
        },
   
        loadWorkInstructions: function(){
            var that=this;        
            let infoModel = that.MainPODcontroller.getInfoModel();
            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathAPIWorkInstructionFile = "/api/workinstruction/v1/attachedworkinstructionsTI";

            let url = BaseProxyURL+pathAPIWorkInstructionFile;
            let plant = infoModel.getProperty("/plant");
            let sfc = infoModel.getProperty("/selectedSFC/sfc");

            let params = {
                plant: plant, 
                sfc: sfc,
                operation: that.primoLivello.operation,
                idLev1: that.primoLivello.id,
                idLev2: that.terzoLivello.parent_id_lev_2,
                idLev3: that.terzoLivello.id_lev_3
            }

            // Callback di successo
            var successCallback = function(response) {
                that.WorkInstructionsModel.setProperty("/workInstructions",response.result);
            };
            // Callback di errore
            var errorCallback = function(error) {
                that.WorkInstructionsModel.setProperty("/workInstructions",[]);
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        rowSelectionChange: function(oEvent){
            var that=this;
            var oTable = oEvent.getSource();
            var selectedIndexWorkInstruction = oTable.getSelectedIndex();
            if( selectedIndexWorkInstruction !== -1 ){
                var selectedWorkInstruction = oTable.getContextByIndex(selectedIndexWorkInstruction).getObject();
                oTable.setSelectedIndex(-1);
                that.loadWorkInstructionContent(selectedWorkInstruction);
            }
        },
        loadWorkInstructionContent: function(selectedWorkInstruction){
            var that=this;    
            //se la work instruction non ha file/documenti allegati
            if(!selectedWorkInstruction.workInstructionElements || selectedWorkInstruction.workInstructionElements.length == 0){
                let errorMessage = that.MainPODcontroller.getI18n("workInstruction.errorMessage.noAttachedFile")
                return that.MainPODcontroller.showErrorMessageBox(errorMessage);
            }
            let workInstructionObj = selectedWorkInstruction.workInstructionElements[0];

            if(workInstructionObj.type==="URL"){
                window.open(workInstructionObj.url, "_blank");
            } else if(workInstructionObj.type==="TEXT"){
                that.MainPODcontroller.showDialogHTML(workInstructionObj.text, workInstructionObj.description);
            } else if(workInstructionObj.type==="HEADER_TEXT"){
                that.MainPODcontroller.showDialogString(workInstructionObj.text, workInstructionObj.description);
            } else if(workInstructionObj.type==="FILE"){
                sap.ui.core.BusyIndicator.show(0);
                that.loadWorkInstructionFile(workInstructionObj);
            }
        },
        loadWorkInstructionFile: function(workInstructionObj){
            var that=this;
            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathAPIWorkInstructionFile = "/api/workinstruction/v1/workinstructions/file";
            let url = BaseProxyURL+pathAPIWorkInstructionFile;

            let fileName = workInstructionObj.fileName;
            let externalFileUrl = workInstructionObj.fileExternalUrl;

            let params = {
                fileName: fileName,
                externalFileUrl: externalFileUrl
            }

            // Callback di successo
            var successCallback = function(response) {
                if (response.fileContent && response.contentType) {
                    // Converte i dati in un Blob
                    var uintArray = new Uint8Array(response.fileContent.data);
                    var blob = new Blob([uintArray], { type: response.contentType });
                    // Crea un URL per il file
                    var fileUrl = URL.createObjectURL(blob);
                    var fileName = response.fileName || "";
    
                    // Determina come visualizzare il file
                    if (response.contentType.includes("pdf")) {
                        // Apri il PDF in una nuova finestra
                        window.open(fileUrl, "_blank");
                    } else if (response.contentType.includes("image")) {
                        // Mostra un'immagine in una nuova finestra o elemento img
                        that.MainPODcontroller.showDialogImage(fileUrl,fileName);
                    } else if (response.contentType.includes("video")) {
                        // Mostra un video su dialog
                        that.MainPODcontroller.showDialogVideo(fileUrl, fileName, response.contentType);
                    } else {
                        //Provo il Download
                        var a = document.createElement("a");
                        a.href = fileUrl;
                        a.download = response.fileName; // Puoi settare il nome del file da scaricare
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }
                } else {
                    that.MainPODcontroller.showErrorMessageBox("No Content File");
                }
                sap.ui.core.BusyIndicator.hide();
            };
            // Callback di errore
            var errorCallback = function(error) {
                sap.ui.core.BusyIndicator.hide();
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        onClosePopup: function () {
            var that = this;
            that.closeDialog();
        }
    })
})
