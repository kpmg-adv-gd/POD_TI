sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../../utilities/CommonCallManager",
    "../../utilities/GenericDialog"
], function (JSONModel, CommonCallManager, Dialog) {
    "use strict";

    return Dialog.extend("kpmg.custom.pod.PODTI.PODTI.controller.popup.OrderProgressPopup", {
        open: function (oView, oController, selectedOrder) {
            var that = this;
            that.OrderProgressPopupModel = new JSONModel();
            that.SinotticoPopupController = oController;
            that._initDialog("kpmg.custom.pod.PODTI.PODTI.view.popup.OrderProgressPopup", oView, that.OrderProgressPopupModel);
            that.OrderProgressPopupModel.setProperty("/selectedOrder",selectedOrder);
            that.openDialog();
            that.calculateProgressPercentage();
        },
        calculateProgressPercentage: function(){
            var that=this;
            let selectedOrder = that.OrderProgressPopupModel.getProperty("/selectedOrder");
            //Già completato
            if(selectedOrder.SfcStatus == "405"){
                const ratioTime = 100;
				that.getView().byId("ProgIndicatorID").setDisplayValue(ratioTime + '%');
                that.getView().byId("ProgIndicatorID").setPercentValue(+ratioTime);
                return;
            } else if (selectedOrder.SfcStatus == "401"){ //Da iniziare
                const ratioTime = 0;
				that.getView().byId("ProgIndicatorID").setDisplayValue(ratioTime + '%');
                that.getView().byId("ProgIndicatorID").setPercentValue(+ratioTime);
                return;
            }
            let BaseProxyURL = that.SinotticoPopupController.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/api/getProgressStatusOrder";
            let url = BaseProxyURL+pathApi;
            let plant = that.SinotticoPopupController.MainPODcontroller.getInfoModel().getProperty("/plant");
			let order = selectedOrder.Order;
			
            let params = {
                "plant": plant,
				"order":order
            }
            // Callback di successo
            var successCallback = function(response) {
                const ratioTime = Math.round((response.totalCompletedTime / response.totalPlannedTime) * 100);
				that.getView().byId("ProgIndicatorID").setDisplayValue(ratioTime + '%');
                that.getView().byId("ProgIndicatorID").setPercentValue(+ratioTime);
            };

            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,false,true);




        },
        onClosePopup: function () {
            var that = this;
            that.closeDialog();
        }
    })
}
)