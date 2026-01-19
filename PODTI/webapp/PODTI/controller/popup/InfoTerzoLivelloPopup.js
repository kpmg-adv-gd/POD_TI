sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../BaseController",
    "../../utilities/CommonCallManager",
    "../../utilities/GenericDialog",
], function (JSONModel, BaseController, CommonCallManager, Dialog) {
    "use strict";

    return Dialog.extend("kpmg.custom.pod.PODTI.PODTI.controller.popup.InfoTerzoLivelloPopup", {

        open: function (oView, oController, rowSelected) {
            var that = this;
            that.infoTerzoLivelloModel = new JSONModel();
            that.MainPODview = oView;
            that.MainPODcontroller = oController;
            that._initDialog("kpmg.custom.pod.PODTI.PODTI.view.popup.InfoTerzoLivelloPopup", oView, that.infoTerzoLivelloModel);
            that.infoTerzoLivelloModel.setProperty("/rowSelected", rowSelected);
            that.loadTestata(rowSelected);
            that.loadInfoTerzoLivello(rowSelected);
            that.openDialog();
        },
        loadTestata: function(rowSelected){
            var that = this;
            var primoLivelloDesc = that.MainPODcontroller.getInfoModel().getProperty("/selectedPrimoLivello/description")
            that.infoTerzoLivelloModel.setProperty("/phase", primoLivelloDesc);
            that.infoTerzoLivelloModel.setProperty("/macroActivity", rowSelected.parent_lev_2);
            that.infoTerzoLivelloModel.setProperty("/checklist", rowSelected.macroAttivita);
        },
        loadInfoTerzoLivello: function(rowSelected){
			var that=this;

            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/db/getInfoTerzoLivello";
            let url = BaseProxyURL+pathApi;

            let plant = that.MainPODcontroller.getInfoModel().getProperty("/plant");
            let params = {
                "plant": plant,
				"sfc": rowSelected.sfc,
                "id_lev_1": that.MainPODcontroller.getInfoModel().getProperty("/selectedPrimoLivello").id,
                "id_lev_2": rowSelected.parent_id_lev_2,
				"id_lev_3": rowSelected.id_lev_3,
				"machine_type": rowSelected.machine_type
            }
            // Callback di successo
            var successCallback = function(response) {
                that.infoTerzoLivelloModel.setProperty("/infoTerzoLivello", response);
            };

            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,false,true);
		},
        onSaveComment: function () {
            var that = this;
            var newComment = that.infoTerzoLivelloModel.getProperty("/newComment");
            var rowSelected = that.infoTerzoLivelloModel.getProperty("/rowSelected");
            if(newComment && newComment.trim() !== ""){
                // Aggiungi il nuovo commento alla lista dei commenti
    			let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
                let pathApi = "/db/saveCommentsVerbale";
                let url = BaseProxyURL+pathApi;

                let plant = that.MainPODcontroller.getInfoModel().getProperty("/plant");

                let params = {
                    "plant": plant,
                    "sfc": rowSelected.sfc,
                    "wbe": rowSelected.wbe,
                    "id_lev_1": that.MainPODcontroller.getInfoModel().getProperty("/selectedPrimoLivello").id,
                    "id_lev_2": rowSelected.parent_id_lev_2,
                    "id_lev_3": rowSelected.id_lev_3,
                    "machine_type": rowSelected.machine_type,
                    "user": that.MainPODcontroller.getInfoModel().getProperty("/user_id"),
                    "comment": newComment,
                    "comment_type": "C",
                    "status": null
                };

                // Callback di successo
                var successCallback = function(response) {
                    that.infoTerzoLivelloModel.setProperty("/newComment", "")
                    that.loadInfoTerzoLivello(rowSelected);
                };

                // Callback di errore
                var errorCallback = function(error) {
                    console.log("Chiamata POST fallita:", error);
                };
                CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,false,true);
            }
        },
        onClosePopup: function () {
            var that = this;
            that.closeDialog();
        }
    })
})
