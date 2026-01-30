sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../BaseController",
    "../../utilities/CommonCallManager",
    "../../utilities/GenericDialog",
    "./OrderProgressPopup",
], function (JSONModel, BaseController, CommonCallManager, Dialog, OrderProgressPopup) {
    "use strict";

    return Dialog.extend("kpmg.custom.pod.PODTI.PODTI.controller.popup.SinotticoPopup", {
        OrderProgressPopup: new OrderProgressPopup(),
        open: function (oView, oController, runTimeOrder) {
            var that = this;
            that.SinotticoBomModel = new JSONModel();
            that.MainPODview = oView;
            that.MainPODcontroller = oController;
            that._initDialog("kpmg.custom.pod.PODTI.PODTI.view.popup.SinotticoPopup", oView, that.SinotticoBomModel);
            that.SinotticoBomModel.setProperty("/RUN_TIME_ORDER",runTimeOrder);
            that.populateFilters();
            that.openDialog();
        },
        
        populateFilters: function(){
            var that=this;
            let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathAPIFilter = "/api/getFilterSinotticoBom";
            let url = BaseProxyURL+pathAPIFilter;
            let plant = that.MainPODcontroller.getInfoModel().getProperty("/plant");
            let infoModel = that.MainPODcontroller.getInfoModel();

            let params = {
                "plant": plant
            }

            // Callback di successo
            var successCallback = function(response) {
                that.SinotticoBomModel.setProperty("/filters", response);
                that.MainPODcontroller.byId("projectInputSinotticoId").setValue(infoModel.getProperty("/selectedSFC/project"))
            };

            // Callback di errore
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);

        },
        onGoPress: function(){
			var that=this;
			let BaseProxyURL = that.MainPODcontroller.getInfoModel().getProperty("/BaseProxyURL");
            let pathApi = "/api/getSinotticoBomMultilivelloReport";
            let url = BaseProxyURL+pathApi;

            let plant = that.MainPODcontroller.getInfoModel().getProperty("/plant");
			let projectValue = that.getView().byId("projectInputSinotticoId").getValue() || "";
			let machineMaterialValue = that.getView().byId("machineMaterialInputId").getValue() || "";

            if (machineMaterialValue == "") {
                return;
            }

            //treeTable.setBusy(true);
			
            let params = {
                "plant": plant,
				"project":projectValue,
				"machineMaterial":machineMaterialValue,
                "callFrom":"SinotticoReport"
            }

            // Callback di successo
            var successCallback = function(response) {
                that.SinotticoBomModel.setProperty("/MaterialList",[response]);
                that.goToRuntimeOrder([response]);
            };

            // Callback di errore
            var errorCallback = function(error) {
                //that.getView().byId("SinotticoTreeTable").setBusy(false);
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,false,true);
		},
        goToRuntimeOrder: function(aNodes){
            var that=this;
            var oTreeTable = that.getView().byId("SinotticoTreeTable");
            let runTimeOrder = that.SinotticoBomModel.getProperty("/RUN_TIME_ORDER");

            const oState = this._flattenTreeData(aNodes,runTimeOrder);

            if (oState.foundIndex !== -1) {
                oTreeTable.expandToLevel(oState.maxDepth);
                // Scrolla fino all'ordine di runTime
                oTreeTable.setFirstVisibleRow(oState.foundIndex);
            }
        },
        //Ritorno l'oggetto oState che contiene i livelli espansi per trovare l'ordine e l'indice della riga trovata se trovata altrimenti -1
        _flattenTreeData: function (aNodes, runTimeOrder, aFlatList = [], iLevel = 0, oState = { maxDepth: 0, foundIndex: -1 }) {
            for (let i = 0; i < aNodes.length; i++) {
                const oNode = aNodes[i];
                oNode._flatIndex = aFlatList.length;
                oNode._treeLevel = iLevel;
                aFlatList.push(oNode);
        
                if (iLevel > oState.maxDepth) {
                    oState.maxDepth = iLevel;
                }
        
                if (oNode.Order === runTimeOrder) {
                    oState.foundIndex = oNode._flatIndex;
                    return oState;  // nodo trovato, ritorna subito stato
                }
        
                if (oNode.Children && oNode.Children.length > 0) {
                    let result = this._flattenTreeData(oNode.Children, runTimeOrder, aFlatList, iLevel + 1, oState);
                    if (result.foundIndex !== -1) {
                        return result; // nodo trovato nei figli, ritorna risultato
                    }
                }
            }
            return oState; // nodo non trovato in questo ramo, ritorna stato aggiornato
        },
        
        onExpandAll: function() {
            var that=this;
			var oTreeTable = that.getView().byId("SinotticoTreeTable");
			oTreeTable.expandToLevel(4);
		},
        onCollapseAll: function() {
            var that=this;
			var oTreeTable = that.getView().byId("SinotticoTreeTable");
			oTreeTable.collapseAll();
		},
        onClosePopup: function () {
            var that = this;
            that.closeDialog();
            that.destroy(); 
        }
    })
})
