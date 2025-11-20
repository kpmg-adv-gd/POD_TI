sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../BaseController",
    "../../utilities/CommonCallManager",
    "../../utilities/GenericDialog"
], function (JSONModel, BaseController, CommonCallManager, Dialog) {
    "use strict";

    return Dialog.extend("kpmg.custom.pod.PODTI.PODTI.controller.popup.MarkingModifichePopup", {

        open: function (oView, oController, selectedLevel1, selectedLevel2) {
            var that = this;
            that.MarkingPopupModel = new JSONModel();
            that.MainPODcontroller = oController;
            that.selectedLevel1 = selectedLevel1;
            that.selectedLevel2 = selectedLevel2;

            that._initDialog("kpmg.custom.pod.PODTI.PODTI.view.popup.MarkingModifichePopup", oView, that.MarkingPopupModel);
            that.clearData();
            that.loadMarkingData();
            that.openDialog();
        },

        clearData: function () {
            var that = this;
            that.getView().byId("hhInputModId").setValue("");
            that.getView().byId("mmInputModId").setValue("");
        },

        loadMarkingData: function () {
            var that = this;
            that.getView().byId("markingDateModPicker").setValue(new Date().getDate() + "/" + (new Date().getMonth()+1) + "/" + new Date().getFullYear()); // data corrente
            that.onRetrievePersonnelNumber(); // PersonnelNumber

            let infoModel = that.MainPODcontroller.getInfoModel();
            that.MarkingPopupModel.setProperty("/project", infoModel.getProperty("/selectedSFC/project"));
            that.MarkingPopupModel.setProperty("/wbe", infoModel.getProperty("/selectedSFC/WBE"));
            that.MarkingPopupModel.setProperty("/selectedLevel1", that.selectedLevel1);
            that.MarkingPopupModel.setProperty("/selectedLevel2", that.selectedLevel2);
        },

        onRetrievePersonnelNumber: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathPersonnelNumberApi = "/api/getPersonnelNumber";
            let url = BaseProxyURL + pathPersonnelNumberApi;

            let plant = infoModel.getProperty("/plant") || "";
            let userId = infoModel.getProperty("/user_id") || "";

            let params = {
                plant: plant,
                userId: userId
            };

            // Callback di successo
            var successCallback = function (response) {
                that.MarkingPopupModel.setProperty("/personnelNumber", response || "");
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        onHHInputChange: function(oEvent){
            var that=this;
            let value = oEvent.getParameters().value;
            let hhInput = that.getView().byId("hhInputModId");
            if(value.length>2) hhInput.setValue(value.substring(0,2));
        },
        onMMInputChange: function(oEvent){
            var that=this;
            var that=this;
            let value = oEvent.getParameters().value;
            let mmInput = that.getView().byId("mmInputModId");
            if(value.length>2) mmInput.setValue(value.substring(0,2));
        },

        validate: function () {
            var that = this;
            var hhInputValue = that.getView().byId("hhInputModId").getValue();
            var mmInputValue = that.getView().byId("mmInputModId").getValue();

            if( (hhInputValue == "" && mmInputValue=="") || (parseInt(hhInputValue,10)==0 && parseInt(mmInputValue,10)==0) ){
                return false;
            } else if( (parseInt(hhInputValue,10)==0 && mmInputValue=="") || (hhInputValue=="" && parseInt(mmInputValue,10)==0) ){
                return false;
            }else if(hhInputValue==""){
                hhInputValue="00";
            } else if (mmInputValue==""){
                mmInputValue="00";
            }
            if(parseInt(mmInputValue,10)<0 || parseInt(mmInputValue,10)>59) return false;

            let confirmation_number = that.MarkingPopupModel.getProperty("/confirmationNumber");
            let personnelNumber = that.MarkingPopupModel.getProperty("/personnelNumber");
            if(!confirmation_number || !personnelNumber) return false;

            return true;
        },

        onConfirmPress: function () {
            var that = this;

            if (that.validate()) {
                const today = new Date();
                const today00 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                if (that.MarkingPopupModel.getProperty("/day") < today00) {
                    sap.m.MessageBox.show(
                        "You're saving for a past date, continue?", // Messaggio da visualizzare
                        {
                            icon: sap.m.MessageBox.Icon.WARNING, // Tipo di icona
                            title: "Warning",         // Titolo della MessageBox
                            actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL], 
                            onClose: function(oAction) {          // Callback all'interazione
                                if (oAction == "OK") that.onConfirm();
                            }
                        }
                    );
                }else{
                    that.onConfirm();
                }
            } else {
                that.MainPODcontroller.showErrorMessageBox(that.MainPODcontroller.getI18n("markNP.errorMessage.validateMarking"));
            }
        },

        onConfirm: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();
            var plant = infoModel.getProperty("/plant");
            let user = infoModel.getProperty("/user_id");
            
            var personnelNumber = that.MarkingPopupModel.getProperty("/personnelNumber");
            let network = that.MarkingPopupModel.getProperty("/network");
            var wbsActivity = that.MarkingPopupModel.getProperty("/wbsActivitySelected");
            var day = that.MarkingPopupModel.getProperty("/day");
            var rowSelectedWBS = that.wbsModel.getProperty("/wbs").filter(item => item.network == network && item.activity_id == wbsActivity)[0];
            let confirmation_number = that.MarkingPopupModel.getProperty("/confirmationNumber");

            var hh = parseInt(that.getView().byId("hhInputId").getValue(),10);
            var mm = parseInt(that.getView().byId("mmInputId").getValue(),10);
            if(!hh) hh=0;
            if(!mm) mm=0;
            var duration = Math.round( (hh + (mm/60)) * 100);

            let params = {
                plant: plant,
                activityNumber: network,
                activityNumberId: wbsActivity,
                cancellation: "",
                confirmation: "",
                confirmationCounter: "",
                confirmationNumber: confirmation_number,
                date: that.formatDate(day),
                duration: "" + duration,
                durationUom: "HCN",
                personalNumber: personnelNumber,
                reasonForVariance: "",
                unCancellation: "",
                unConfirmation: "X",
                rowSelectedWBS: rowSelectedWBS,
                userId: user
            }

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathSendMarkingApi = "/api/sendZDMConfirmations";
            let url = BaseProxyURL + pathSendMarkingApi;

            // Callback di successo
            var successCallback = function (response) {
                that.MainPODcontroller.showToast(that.MainPODcontroller.getI18n("marking.success.message"));
                that.onClosePopup();
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
                that.MainPODcontroller.showErrorMessageBox(error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that,true,true);
        },

        onClosePopup: function () {
            var that = this;
            that.closeDialog();
        },

        onVarianceButtonPressed: function (oEvent) {
            var that = this;

            if (!that._oVariancePopover) {
                that._oTable = new sap.m.Table({
                    mode: "SingleSelectMaster",
                    columns: [
                        new sap.m.Column({ header: new sap.m.Label({ text: "Plant" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Cause" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Description" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Notes" }) })
                    ],
                    items: {
                        path: "varianceModel>/rows",
                        template: new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Text({ text: "{varianceModel>plant}" }),
                                new sap.m.Text({ text: "{varianceModel>cause}" }),
                                new sap.m.Text({ text: "{varianceModel>description}" }),
                                new sap.m.Text({ text: "{varianceModel>notes}" })
                            ]
                        })
                    },
                    selectionChange: function (oEvent) {
                        var oSelectedItem = oEvent.getParameter("listItem");
                        var oContext = oSelectedItem.getBindingContext("varianceModel");
                        that._selectedCause = oContext.getProperty("cause");
                        that._selectedDescription = oContext.getProperty("description");
                        that._oConfirmButton.setEnabled(true);
                    }
                });

                that._oVariancePopover = new sap.m.Popover({
                    showHeader: false,
                    placement: "Right",
                    contentWidth: "600px",
                    contentHeight: "300px",
                    content: [
                        new sap.m.SearchField({
                            placeholder: "Search description...",
                            liveChange: function (oEvent) {
                                var sQuery = oEvent.getParameter("newValue");
                                var oTable = that._oTable;
                                var oBinding = oTable.getBinding("items");
                                var aFilters = [];

                                if (sQuery) {
                                    var oFilter = new sap.ui.model.Filter(
                                        "description",
                                        sap.ui.model.FilterOperator.Contains,
                                        sQuery
                                    );
                                    aFilters.push(oFilter);
                                }

                                oBinding.filter(aFilters);
                            }
                        }),
                        that._oTable

                    ],
                    footer: new sap.m.Toolbar({
                        content: [
                            new sap.m.Button({
                                text: "Confirm",
                                enabled: false,
                                press: function () {
                                    that.onConfirmVarianceSelection();
                                }
                            }),
                            new sap.m.Button({
                                text: "Cancel",
                                press: function () {
                                    that.getView().byId("selectedVarianceModText").setText("");
                                }
                            }),
                            new sap.m.Button({
                                text: "Close",
                                press: function () {
                                    that._oVariancePopover.close();
                                }
                            })
                        ]
                    })
                });

                that.getView().addDependent(that._oVariancePopover);
                that._oConfirmButton = that._oVariancePopover.getFooter().getContent()[0];
            }

            that._oConfirmButton.setEnabled(false);
            that._selectedCause = null;
            that._selectedDescription = null;

            that.onGetReasonsForVariance();
            that._oVariancePopover.openBy(oEvent.getSource());
        },
        onConfirmVarianceSelection: function () {
            var that = this;
            var varianceSelection;

            if (that._selectedCause && that._selectedDescription) {
                varianceSelection = that._selectedCause;
                that.getView().byId("selectedVarianceModText").setText(that._selectedDescription);

                that._oVariancePopover.close();
            } else {
                varianceSelection = "";
                sap.m.MessageToast.show("No reason selected.");
            }

            return varianceSelection;
        },
        onUpdateButtonPressed: function (oEvent) {
            var that = this;

            if (!that._oUpdatePopover) {
                that._oTable = new sap.m.Table({
                    mode: "SingleSelectMaster",
                    columns: [
                        new sap.m.Column({ header: new sap.m.Label({ text: "Progressive Eco" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Process Id" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Flux Type" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Type Modification" }) })
                    ],
                    items: {
                        path: "updateModel>/rows",
                        template: new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Text({ text: "{updateModel>prog_eco}" }),
                                new sap.m.Text({ text: "{updateModel>process_id}" }),
                                new sap.m.Text({ text: "{updateModel>flux_type}" }),
                                new sap.m.Text({ text: "{updateModel>type}" })
                            ]
                        })
                    },
                    selectionChange: function (oEvent) {
                        var oSelectedItem = oEvent.getParameter("listItem");
                        var oContext = oSelectedItem.getBindingContext("updateModel");
                        that._selectedProgEco = oContext.getProperty("prog_eco");
                        that._selectedProcessId = oContext.getProperty("process_id");
                        that._selectedFluxType = oContext.getProperty("flux_type");
                        that._selectedTypeModification = oContext.getProperty("type");
                        that._oConfirmUpdateButton.setEnabled(true);
                    }
                });

                that._oUpdatePopover = new sap.m.Popover({
                    showHeader: false,
                    placement: "Right",
                    contentWidth: "600px",
                    contentHeight: "300px",
                    content: [
                        new sap.m.SearchField({
                            placeholder: "Search description...",
                            liveChange: function (oEvent) {
                                var sQuery = oEvent.getParameter("newValue");
                                var oTable = that._oTable;
                                var oBinding = oTable.getBinding("items");
                                var aFilters = [];

                                if (sQuery) {
                                    var oFilter = new sap.ui.model.Filter(
                                        "description",
                                        sap.ui.model.FilterOperator.Contains,
                                        sQuery
                                    );
                                    aFilters.push(oFilter);
                                }

                                oBinding.filter(aFilters);
                            }
                        }),
                        that._oTable

                    ],
                    footer: new sap.m.Toolbar({
                        content: [
                            new sap.m.Button({
                                text: "Confirm",
                                enabled: false,
                                press: function () {
                                    that.onConfirmUpdateSelection();
                                }
                            }),
                            new sap.m.Button({
                                text: "Cancel",
                                press: function () {
                                    
                                }
                            }),
                            new sap.m.Button({
                                text: "Close",
                                press: function () {
                                    that._oUpdatePopover.close();
                                }
                            })
                        ]
                    })
                });

                that.getView().addDependent(that._oUpdatePopover);
                that._oConfirmUpdateButton = that._oUpdatePopover.getFooter().getContent()[0];
            }

            that._oConfirmUpdateButton.setEnabled(false);
            that._selectedProgEco = null;
            that._selectedProcessId = null;
            that._selectedFluxType = null;
            that._selectedTypeModification = null;
            that.onGetUpdateTable();
            that._oUpdatePopover.openBy(oEvent.getSource());

        },
        onConfirmUpdateSelection: function () {
            var that = this;

            if (!!that._selectedProgEco ) {
                //that.getView().byId("selectedUpdateText").setText(that._selectedProgEco);
                that._oUpdatePopover.close();
            } else if (!!that._selectedProcessId ){
                //that.getView().byId("selectedUpdateText").setText(that._selectedProcessId);
                that._oUpdatePopover.close();
            } else {
                sap.m.MessageToast.show("No Modification selected.");
            }

        },
        onGetReasonsForVariance: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathReasonForVarianceApi = "/db/getReasonsForVariance";
            let url = BaseProxyURL + pathReasonForVarianceApi;

            let params = {};

            // Callback di successo
            var successCallback = function (response) {
                var oModel = new JSONModel();
                oModel.setProperty("/rows", response);
                that.getView().setModel(oModel, "varianceModel");;
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        formatDate: function (oDate) {
            if (!oDate) return "";

            // Se oDate è una stringa ISO, la convertiamo in oggetto Date
            if (typeof oDate === "string") {
                oDate = new Date(oDate);
            }

            const giorno = oDate.getDate().toString().padStart(2, '0');
            const mese = (oDate.getMonth() + 1).toString().padStart(2, '0'); // i mesi partono da 0
            const anno = oDate.getFullYear();

            return `${giorno}/${mese}/${anno}`;
        }
    })
}
)