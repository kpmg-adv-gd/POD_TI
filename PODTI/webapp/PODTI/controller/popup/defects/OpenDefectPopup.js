sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "../../BaseController",
    "../../../utilities/CommonCallManager",
    "../../../utilities/GenericDialog"
], function (JSONModel, BaseController, CommonCallManager, Dialog) {
    "use strict";

    return Dialog.extend("kpmg.custom.pod.PODTI.PODTI.controller.popup.defects.OpenDefectPopup", {
        ID: 0,
        open: function (oView, oController, selectedObject, isAdditionalOperation) {
            var that = this;
            that.OpenDefectModel = new JSONModel();
            that.MainPODcontroller = oController;
            that.selectedObject = selectedObject;
            that.isAdditionalOperation = isAdditionalOperation;

            that._initDialog("kpmg.custom.pod.PODTI.PODTI.view.popup.defects.OpenDefectPopup", oView, that.OpenDefectModel);

            that.clearData();
            that.loadHeaderData();
            that.getCodeGroups();
            that.getPriority();
            that.getCoding();
            that.getNotificationType();
            that.getResponsible();
            that.getVariance();
            if (!isAdditionalOperation) that.getMaterials();
            that.getCauses();

            that.openDialog();
        },

        clearData: function () {
            var that = this;
            var user = that.MainPODcontroller.getInfoModel().getProperty("/user_id");

            that.OpenDefectModel.setProperty("/defect", {
                material: "",
                assembly: "",
                numDefect: 1,
                title: "",
                description: user,
                codeGroup: "",
                defectType: "",
                priority: "",
                variance: "",
                blocking: false,
                createQN: false,
                notificationType: "",
                coding: "",
                replaceInAssembly: 0,
                defectNote: "",
                responsible: "",
                attachments: [],
            });
            that.OpenDefectModel.setProperty("/responsiblesVis2", false);
            that.OpenDefectModel.setProperty("/responsiblesVis3", false);
            that.OpenDefectModel.setProperty("/responsiblesVis4", false);
            //   that.getView().byId("attachID").clear();

        },
        loadHeaderData: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();

            const wbe = infoModel.getProperty("/selectedSFC/WBE") || "";
            if (!that.isAdditionalOperation) var sfc = infoModel.getProperty("/selectedSFC/sfc"); else var sfc = that.selectedObject.sfc; 
            const wc = infoModel.getProperty("/selectedSFC/workcenter_lev_2") || "";

            that.OpenDefectModel.setProperty("/wbe", wbe);
            that.OpenDefectModel.setProperty("/sfc", sfc);
            that.OpenDefectModel.setProperty("/wc", wc);
            that.OpenDefectModel.setProperty("/isAdditionalOperation", that.isAdditionalOperation);
            if (that.isAdditionalOperation) {
                that.OpenDefectModel.setProperty("/defect/material", that.selectedObject.group_code)
                try {
                    var order = that.selectedObject.mes_order;
                    that.getOrderAddOpts(order);
                } catch (e) {
                    console.log("Materiale o Ordine non trovato");
                }
            }

        },

        getOrderAddOpts: function (order) {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();

            var plant = infoModel.getProperty("/plant");

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathGetMarkingDataApi = "/api/order/v1/orders";
            let url = BaseProxyURL + pathGetMarkingDataApi;
            url += "?plant=" + plant;
            url += "&order=" + order;

            let params = {
            };

            // Callback di successo
            var successCallback = function (response) {
                if (response.orderResponse && response.orderResponse.bom) {
                    if (response.orderResponse.customValues.filter(custom => custom.attribute == "ORDER_TYPE").length > 0
                        && response.orderResponse.customValues.filter(custom => custom.attribute == "ORDER_TYPE")[0].value == "GRPF") {
                            that.OpenDefectModel.setProperty("/defect/typeOrderDesc", "Purchase Doc.");
                            that.OpenDefectModel.setProperty("/defect/prodOrder", response.orderResponse.customValues.filter(custom => custom.attribute == "PURCHASE_ORDER")[0].value);
                    } else if (response.orderResponse.customValues.filter(custom => custom.attribute == "ORDER_TYPE").length > 0
                            && response.orderResponse.customValues.filter(custom => custom.attribute == "ORDER_TYPE")[0].value == "ZMGF") {
                        that.OpenDefectModel.setProperty("/defect/typeOrderDesc", "Prod. Order");
                        that.OpenDefectModel.setProperty("/defect/prodOrder", "");
                    } else{
                        that.OpenDefectModel.setProperty("/defect/typeOrderDesc", "Prod. Order");
                        that.OpenDefectModel.setProperty("/defect/prodOrder", order);
                    }
                    that.OpenDefectModel.setProperty("/defect/typeOrder", response.orderResponse.customValues.filter(custom => custom.attribute == "ORDER_TYPE")[0].value);
                }
                that.getAssemblies(response.orderResponse.bom.bom, response.orderResponse.bom.type);
                that.OpenDefectModel.setProperty("/wbe", response.orderResponse.customValues.filter(custom => custom.attribute == "WBE")[0].value);
            };
            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata GET fallita: ", error);
            };
            CommonCallManager.callProxy("GET", url, params, true, successCallback, errorCallback, that);

        },

        getOrdersByMaterial: function (oEvent) {
            var that = this;
            var material = that.OpenDefectModel.getProperty("/defect/material");

            if (material.length == 0) {
                that.OpenDefectModel.setProperty("/ordersByMaterial", []);
                that.OpenDefectModel.setProperty("/defect/prodOrder", "");
                return;
            }
            var orders = that.OpenDefectModel.getProperty("/materials").filter(item => item.material == material)[0].orders;

            // Se ho un solo ordine valorizzo in automatico il menu a tendina
            if (orders.length == 1) {
                that.OpenDefectModel.setProperty("/ordersByMaterial", orders);
                that.OpenDefectModel.setProperty("/defect/prodOrder", orders[0].order);
                that.OpenDefectModel.setProperty("/defect/typeOrder", orders[0].typeOrder);
                that.OpenDefectModel.setProperty("/defect/typeOrderDesc", orders[0].typeOrderDesc);
                that.getOrder(orders[0].originalOrder);
            }else{
                that.OpenDefectModel.setProperty("/ordersByMaterial", [...[{ order: "", typeOrder: "", typeOrderDesc: "" }], ...orders]);
            }
        },
        getOrder: function (order) {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();

            var plant = infoModel.getProperty("/plant");

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathGetMarkingDataApi = "/api/order/v1/orders";
            let url = BaseProxyURL + pathGetMarkingDataApi;
            url += "?plant=" + plant;
            url += "&order=" + order;

            let params = {
            };

            // Callback di successo
            var successCallback = function (response) {
                if (response.orderResponse && response.orderResponse.bom) {
                    that.getAssemblies(response.orderResponse.bom.bom, response.orderResponse.bom.type);
                }
            };
            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata GET fallita: ", error);
            };
            CommonCallManager.callProxy("GET", url, params, true, successCallback, errorCallback, that);

        },
        getAssemblies: function (bom, type) {
            var that = this;

            var infoModel = that.MainPODcontroller.getInfoModel();

            var plant = infoModel.getProperty("/plant");

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathGetMarkingDataApi = "/api/bom/v1/boms";
            let url = BaseProxyURL + pathGetMarkingDataApi;
            url += "?plant=" + plant;
            url += "&bom=" + bom;
            url += "&type=" + type;

            // Callback di successo
            var successCallback = function (response) {
                var assemblies = [];
                response.bomResponse[0].components.forEach(item => {
                    var material = item.material.material;
                    if (item.customValues.filter(cf => cf.attribute == "DESCRIZIONE COMPONENTE").length > 0) {
                        var description = item.customValues.filter(cf => cf.attribute == "DESCRIZIONE COMPONENTE")[0].value;
                    }else{
                        var description = "";
                    }
                    assemblies.push({
                        material: material,
                        description: description
                    })
                });
                this.OpenDefectModel.setProperty("/assemblies", [...[ { material: "", description: "" }], ...assemblies]);
            };
            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata GET fallita: ", error);
            };
            CommonCallManager.callProxy("GET", url, {}, true, successCallback, errorCallback, that);
        },
        changeOrder: function (oEvent) {
            var that = this;
            var order = that.OpenDefectModel.getProperty("/defect/prodOrder");
            var selected = that.OpenDefectModel.getProperty("/ordersByMaterial")
                .filter(ord => ord.order == order);
            if (selected.length == 0) {
                that.OpenDefectModel.setProperty("/defect/typeOrder", "");
                that.OpenDefectModel.setProperty("/defect/typeOrderDesc", "");
                that.OpenDefectModel.setProperty("/assemblies", []);
            }else{
                that.OpenDefectModel.setProperty("/defect/typeOrder", selected[0].typeOrder);
                that.OpenDefectModel.setProperty("/defect/typeOrderDesc", selected[0].typeOrderDesc);
                that.getOrder(selected[0].originalOrder);
            }
        },
        getCodeGroups: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();
            var plant = infoModel.getProperty("/plant");

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathGetMarkingDataApi = "/api/nonconformancegroup/v1/nonconformancegroups?plant=" + plant;
            let url = BaseProxyURL + pathGetMarkingDataApi;

            let params = {

            };

            // Callback di successo
            var successCallback = function (response) {
                if (response.groupResponse) {
                    this.OpenDefectModel.setProperty("/codeGroups", [...[{ group: "", description: "" }], ...response.groupResponse]);
                }
            };
            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata GET fallita: ", error);
            };
            CommonCallManager.callProxy("GET", url, params, true, successCallback, errorCallback, that);
        },
        onChangeCodeGroup: function (oEvent) {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();
            var plant = infoModel.getProperty("/plant");
            var group = that.OpenDefectModel.getProperty("/defect/codeGroup");

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathGetMarkingDataApi = "/api/nonconformancecode/v1/nonconformancecodes?plant=" + plant;
            let url = BaseProxyURL + pathGetMarkingDataApi;

            let params = {
            };

            // Callback di successo
            var successCallback = function (response) {
                if (response.codeResponse) {
                    var filter = response.codeResponse.filter(item => item.status == "ENABLED" && item.groups.filter(mc => mc.group == group).length > 0);
                    this.OpenDefectModel.setProperty("/defectTypes", [...[{ code: "", description: "" }], ...filter]);

                }
            };
            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata GET fallita: ", error);
            };
            CommonCallManager.callProxy("GET", url, params, true, successCallback, errorCallback, that);
        },
        getPriority: function () {
            var that = this;

            var infoModel = that.MainPODcontroller.getInfoModel();
            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathGetMarkingDataApi = "/db/getZPriorityData";
            let url = BaseProxyURL + pathGetMarkingDataApi;

            let params = {};

            // Callback di successo
            var successCallback = function (response) {
                this.OpenDefectModel.setProperty("/priorities", [...[{ priority: "", description: "" }], ...response]);
            };
            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        getVariance: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();
            var plant = infoModel.getProperty("/plant");

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathReasonForVarianceApi = "/db/getReasonsForVariance";
            let url = BaseProxyURL + pathReasonForVarianceApi;

            let params = {};

            // Callback di successo
            var successCallback = function (response) {
                this.OpenDefectModel.setProperty("/variances", [...[{ cause: "", description: "" }], ...response.filter(item => item.plant == plant)]);
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        getCauses: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();
            var plant = infoModel.getProperty("/plant");

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathReasonForVarianceApi = "/db/getCauses";
            let url = BaseProxyURL + pathReasonForVarianceApi;

            let params = {
                plant: plant
            };

            // Callback di successo
            var successCallback = function (response) {
                this.OpenDefectModel.setProperty("/causes", [...[{ cause: "", description: "" }], ...response]);
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        getCoding: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();
            var plant = infoModel.getProperty("/plant");

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathReasonForVarianceApi = "/db/getZCodingData";
            let url = BaseProxyURL + pathReasonForVarianceApi;

            let params = {
                plant: plant
            };

            // Callback di successo
            var successCallback = function (response) {
                var codingGroups = [];
                response.forEach(item => {
                    if (codingGroups.filter(c => c.coding_group == item.coding_group).length == 0) {
                        codingGroups.push({
                            coding_group: item.coding_group,
                            coding_group_description: item.coding_group_description
                        });
                    }
                })
                this.OpenDefectModel.setProperty("/responseCoding", response);
                this.OpenDefectModel.setProperty("/codingGroups", [...[{ coding_group: "", coding_group_description: "" }], ...codingGroups]);
                this.OpenDefectModel.setProperty("/codings", [...[{ coding_id: "", coding_description: "" }], ...[]]);
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        onChangeCoding: function (oEvent) {
            var that = this;
            var coding_group = that.OpenDefectModel.getProperty("/defect/coding_group");
            var codings = [];
            this.OpenDefectModel.getProperty("/responseCoding").forEach(item => {
                if (item.coding_group == coding_group) {
                    codings.push({
                        coding_id: item.id,
                        coding_description: item.coding_description
                    });
                }
            })
            that.OpenDefectModel.setProperty("/codings", [...[{ coding_id: "", coding_description: "" }], ...codings]);
            that.OpenDefectModel.setProperty("/defect/coding_id", "");
        },
        getMaterials: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();
            var plant = infoModel.getProperty("/plant");
            var project = that.MainPODcontroller.getView().getModel("PODSfcModel").getProperty("/project")

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathReasonForVarianceApi = "/db/getMaterialsTI";
            let url = BaseProxyURL + pathReasonForVarianceApi;

            let params = {
                plant: plant,
                project: project
            };

            // Callback di successo
            var successCallback = function (response) {
                that.OpenDefectModel.setProperty("/materials", [...[{ material: "" }], ...response]);
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        getResponsible: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();
            var plant = infoModel.getProperty("/plant");

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathReasonForVarianceApi = "/db/getZResponsibleData";
            let url = BaseProxyURL + pathReasonForVarianceApi;

            let params = {
                plant: plant
            };

            // Callback di successo
            var successCallback = function (response) {
                var responsibles1 = [];
                response.forEach(item => {
                    if (responsibles1.filter(r => r.description == item.org_level_1).length == 0) {
                        responsibles1.push({
                            id: item.id,
                            description: item.org_level_1
                        })
                    }
                });
                that.OpenDefectModel.setProperty("/responsibles", response);
                that.OpenDefectModel.setProperty("/responsibles1", [...[{ id: "" }], ...responsibles1]);
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        changeResponsible1: function (oEvent) {
            var that = this;
            var allResponsible = that.OpenDefectModel.getProperty("/responsibles");
            var responsibles2 = [];

            if (that.OpenDefectModel.getProperty("/defect/responsible1") != "") {
                var responsible1 = allResponsible.filter(item => item.id == that.OpenDefectModel.getProperty("/defect/responsible1"))[0].org_level_1;
                allResponsible.forEach(item => {
                    if (item.org_level_1 == responsible1 && responsibles2.filter(r => r.description == item.org_level_2).length == 0 && item.org_level_2 != null) {
                        responsibles2.push({
                                id: item.id,
                                description: item.org_level_2
                            })
                    }
                })
            }

            if (responsibles2.length == 0) {
                that.OpenDefectModel.setProperty("/responsibles2", []);
                that.OpenDefectModel.setProperty("/responsiblesVis2", false);
            }else{
                that.OpenDefectModel.setProperty("/responsibles2", [...[{ id: "" }], ...responsibles2]);
                that.OpenDefectModel.setProperty("/responsiblesVis2", true);
            }
            that.OpenDefectModel.setProperty("/defect/responsible2", "");
            that.OpenDefectModel.setProperty("/defect/responsible3", "");
            that.OpenDefectModel.setProperty("/defect/responsible4", "");
            that.OpenDefectModel.setProperty("/responsibles3", []);
            that.OpenDefectModel.setProperty("/responsibles4", []);
            that.OpenDefectModel.setProperty("/responsiblesVis3", false);
            that.OpenDefectModel.setProperty("/responsiblesVis4", false);
        },
        changeResponsible2: function (oEvent) {
            var that = this;
            var allResponsible = that.OpenDefectModel.getProperty("/responsibles");
            var responsibles3 = [];
            
            if (that.OpenDefectModel.getProperty("/defect/responsible2") != "") {
                var responsible1 = allResponsible.filter(item => item.id == that.OpenDefectModel.getProperty("/defect/responsible1"))[0].org_level_1;
                var responsible2 = allResponsible.filter(item => item.id == that.OpenDefectModel.getProperty("/defect/responsible2"))[0].org_level_2;
                allResponsible.forEach(item => {
                    if (item.org_level_1 == responsible1 && item.org_level_2 == responsible2 && responsibles3.filter(r => r.description == item.org_level_3).length == 0
                        && item.org_level_3 != null) {
                        responsibles3.push({
                                id: item.id,
                                description: item.org_level_3
                            })
                    }
                })
            }
            if (responsibles3.length == 0) {
                that.OpenDefectModel.setProperty("/responsibles3", []);
                that.OpenDefectModel.setProperty("/responsiblesVis3", false);
            }else{
                that.OpenDefectModel.setProperty("/responsibles3", [...[{ id: "" }], ...responsibles3]);
                that.OpenDefectModel.setProperty("/responsiblesVis3", true);
            }
            that.OpenDefectModel.setProperty("/defect/responsible3", "");
            that.OpenDefectModel.setProperty("/defect/responsible4", "");
            that.OpenDefectModel.setProperty("/responsiblesVis4", false);
            that.OpenDefectModel.setProperty("/responsiblesVis4", []);
        },
        changeResponsible3: function (oEvent) {
            var that = this;
            var allResponsible = that.OpenDefectModel.getProperty("/responsibles");
            var responsibles4 = [];
            
            if (that.OpenDefectModel.getProperty("/defect/responsible2") != "") {
                var responsible1 = allResponsible.filter(item => item.id == that.OpenDefectModel.getProperty("/defect/responsible1"))[0].org_level_1;
                var responsible2 = allResponsible.filter(item => item.id == that.OpenDefectModel.getProperty("/defect/responsible2"))[0].org_level_2;
                var responsible3 = allResponsible.filter(item => item.id == that.OpenDefectModel.getProperty("/defect/responsible3"))[0].org_level_3;
                allResponsible.forEach(item => {
                    if (item.org_level_1 == responsible1 && item.org_level_2 == responsible2 && item.org_level_3 == responsible3 
                        && responsibles4.filter(r => r.description == item.org_level_4).length == 0 && item.org_level_4 != null) {
                        responsibles4.push({
                                id: item.id,
                                description: item.org_level_4
                            })
                    }
                })
            }
            if (responsibles4.length == 0) {
                that.OpenDefectModel.setProperty("/responsibles4", []);
                that.OpenDefectModel.setProperty("/responsiblesVis4", false);
            }else{
                that.OpenDefectModel.setProperty("/responsibles4", [...[{ id: "" }], ...responsibles4]);
                that.OpenDefectModel.setProperty("/responsiblesVis4", true);
            }
            that.OpenDefectModel.setProperty("/defect/responsible4", "");
        },
        getNotificationType: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathReasonForVarianceApi = "/db/getZNotificationTypeData";
            let url = BaseProxyURL + pathReasonForVarianceApi;

            let params = {};

            // Callback di successo
            var successCallback = function (response) {
                this.OpenDefectModel.setProperty("/notificationTypies", [...[{ notification_type: "", description: "" }], ...response]);
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        popAllegaPress: function (oEvent) {
            var that = this;
            var oDialog = that.getView().byId("uploadDialog");
            oDialog.open();
        },
        deleteAttachment: function (oEvent) {
            var that = this;
            var idDeleted = oEvent.getSource().getBindingContext().getObject().ID;
            that.OpenDefectModel.setProperty("/defect/attachments", that.OpenDefectModel.getProperty("/defect/attachments").filter(item => item.ID != idDeleted))
        },
        handleUploadPress: function (oEvent) {
            var that = this;
            var oFileUploader = that.getView().byId("attachID");
            oFileUploader.upload();
            oFileUploader.clear();
            var oDialog = that.getView().byId("uploadDialog");
            oDialog.close();
        },
        uploadDocument: function (oEvent) {
            var that = this;
            const aFiles = oEvent.getParameter("files");

            if (aFiles && aFiles.length > 0) {
                const oFile = aFiles[0]; // Prendiamo solo il primo file
                const reader = new FileReader();

                reader.onload = function (e) {
                    const base64String = e.target.result.split(",")[1]; // Rimuove il prefix "data:*/*;base64,"

                    that.OpenDefectModel.getProperty("/defect/attachments").push({
                        "ID": that.ID,
                        "BASE_64": base64String,
                        "FILE_NAME": oFile.name,
                        "FILE_TYPE": oFile.type
                    });
                    that.OpenDefectModel.refresh();
                    that.ID++;
                    var oFileUploader = that.getView().byId("attachID");
                    oFileUploader.clear();
                };

                reader.onerror = function (err) {
                    console.error("Errore nella lettura del file:", err);
                };

                reader.readAsDataURL(oFile);
            }
        },

        validate: function () {
            var that = this;
            var defect = that.OpenDefectModel.getProperty("/defect");

            // Check sui campo obbligatori
            if (defect.numDefect == "" || defect.title == "" || defect.codeGroup == "" || defect.defectType == "" || defect.priority == ""
                || defect.variance == "" || defect.cause == "") {
                that.MainPODcontroller.showErrorMessageBox(that.MainPODcontroller.getI18n("defect.error.message"));
                return false;
            }
            if (defect.createQN && (defect.coding_id == "" || defect.coding_id == null || defect.notificationType == "" || defect.notificationType == null || (defect.replaceInAssembly != 0 && defect.replaceInAssembly != 1))) {
                that.MainPODcontroller.showErrorMessageBox(that.MainPODcontroller.getI18n("defect.error.message"));
                return false;
            }

            // Logica per il recupero del Responsible
            if (defect.createQN) {
                var level = 4;
                defect.responsible = defect.responsible4
                if (!defect.responsible || defect.responsible == "") {
                    defect.responsible = defect.responsible3
                    level--;
                }
                if (!defect.responsible || defect.responsible == "") {
                    defect.responsible = defect.responsible2
                    level--;
                }
                if (!defect.responsible || defect.responsible == "") {
                    defect.responsible = defect.responsible1
                    level--;
                }
                if (!defect.responsible || defect.responsible == "" || (level < 4 && that.OpenDefectModel.getProperty("/responsibles" + (level+1)) != undefined && that.OpenDefectModel.getProperty("/responsibles" + (level+1)).length > 0 )) {
                    that.MainPODcontroller.showErrorMessageBox(that.MainPODcontroller.getI18n("defect.error.message"));
                    return false;
                }
            }

            // Check su Costraint della Priority
            try {
                var priorityScript = JSON.parse(that.OpenDefectModel.getProperty("/priorities").filter(item => item.priority == defect.priority)[0].costraints);
                for (let chiave in priorityScript) {
                    for (let key in priorityScript[chiave]) {
                        if ((priorityScript[chiave][key] == true && defect[key] == "") || (priorityScript[chiave][key].length > 0 && defect[key] != priorityScript[chiave][key])) {
                            that.MainPODcontroller.showErrorMessageBox("Error Priority to field " + key);
                            return false;
                        }
                    }
                }
            } catch (e) {
                console.log("errore nel parsing json Priority");
            }
            // Check su Costraint della Notification Type
            if (defect.createQN) {
                try {
                    var notificationTypeScript = JSON.parse(that.OpenDefectModel.getProperty("/notificationTypies").filter(item => item.notification_type == defect.notificationType)[0].costraints);
                    for (let chiave in notificationTypeScript) {
                        for (let key in notificationTypeScript[chiave]) {
                            if ((notificationTypeScript[chiave][key] == true && defect[key] == "") || (notificationTypeScript[chiave][key].length > 0 && defect[key] != notificationTypeScript[chiave][key])) {
                                that.MainPODcontroller.showErrorMessageBox("Error Notification Type to field " + key);
                                return false;
                            }
                        }
                    }
                } catch (e) {
                    console.log("errore nel parsing json Notification Type");
                }
            }

            return true;

        },
        onConfirm: function () {
            var that = this;
            if (that.validate()) {
                that.openDefect();
            }
        },
        openDefect: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();
            var defect = that.OpenDefectModel.getProperty("/defect");

            var plant = infoModel.getProperty("/plant");
            if (!that.isAdditionalOperation) var sfc = infoModel.getProperty("/selectedSFC/sfc"); else var sfc = that.selectedObject.sfc; 
            if (!that.isAdditionalOperation) var order = infoModel.getProperty("/selectedSFC/order"); else var order = that.selectedObject.order;
            var wc = infoModel.getProperty("/selectedSFC/workcenter_lev_2") || "";
            var stepId = that.isAdditionalOperation ? that.selectedObject.step_id : infoModel.getProperty("/selectedPrimoLivello").id;


            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathModificationApi = "/api/nonconformance/v1/log";
            let url = BaseProxyURL + pathModificationApi;

            let params = {
                code: defect.defectType,
                plant: plant,
                sfc: sfc,
                workcenter: wc,
                quantity: defect.numDefect,
                routingStepId: stepId,
                startSfcRequired: false,
                allowNotAssembledComponents: false,
                order: order,
            };
            if (defect.attachments.length > 0) {
                params.files = [];
                defect.attachments.forEach(element => {
                    params.files.push({
                        fileContent: element.BASE_64,
                        fileMediaType: element.FILE_TYPE,
                        fileName: element.FILE_NAME
                    });
                });
            }

            // Callback di successo
            var successCallback = function (response) {
                // Se il salvataggio da API standard è andato a buon fine, procedo salvando nella z_defects
                that.saveZDefects(response.ids[0].ids[0]);
                // Procedo ad aggiornare il campo nonconformances sul task selezionato
                if (!that.isAdditionalOperation && that.selectedObject.nonconformances != undefined && that.selectedObject.nonconformances == false)
                    that.updateNonConformanceLevel3();

            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
                that.MainPODcontroller.showErrorMessageBox(error);
                sap.ui.core.BusyIndicator.hide();
            };

            sap.ui.core.BusyIndicator.show(0);
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
        saveZDefects: function (idDefect) {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();
            var defect = that.OpenDefectModel.getProperty("/defect");
            if (!that.isAdditionalOperation) var sfc = infoModel.getProperty("/selectedSFC/sfc"); else var sfc = that.selectedObject.sfc; 
            var user = infoModel.getProperty("/user_id");
            var plant = infoModel.getProperty("/plant");
            if (!that.isAdditionalOperation) var order = infoModel.getProperty("/selectedSFC/order"); else var order = that.selectedObject.order;

            if (that.isAdditionalOperation) {
                var operation = that.selectedObject.operation
            } else {
                var operation = infoModel.getProperty("/selectedPrimoLivello").operation
            }

            let params = {
                idDefect: idDefect,
                material: defect.material,
                mesOrder: defect.prodOrder,
                dmOrder: order,
                assembly: defect.assembly,
                title: defect.title,
                description: defect.description,
                priority: defect.priority,
                variance: defect.variance,
                blocking: defect.blocking,
                createQN: defect.createQN,
                cause: defect.cause,
                sfc: sfc,
                user: user,
                operation: operation,
                plant: plant,
                group: defect.codeGroup,
                code: defect.defectType,
                wbe: that.OpenDefectModel.getProperty("/wbe"),
                typeOrder: defect.typeOrder,
                project: infoModel.getProperty("/selectedSFC/project"),
                phase: "Testing",
                idLev1: that.selectedObject.level ? infoModel.getProperty("/selectedPrimoLivello").id : null,
                idLev2: that.selectedObject.level ? that.selectedObject.parent_id_lev_2 : null,
                idLev3: that.selectedObject.level ? that.selectedObject.id_lev_3 : null
            }
            if (defect.createQN) {
                params.notificationType = defect.notificationType;
                params.coding = defect.coding_id;
                params.replaceInAssembly = defect.replaceInAssembly == 0;
                params.defectNote = defect.defectNote;
                params.responsible = defect.responsible;
            }

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathSendMarkingApi = "/db/insertDefect";
            let url = BaseProxyURL + pathSendMarkingApi;

            // Callback di successo
            var successCallback = function (response) {
                // publish difetti
                if (this.isAdditionalOperation) sap.ui.getCore().getEventBus().publish("AdditionalOperations", "loadAdditionalOperations", null);
                sap.m.MessageBox.show(that.MainPODcontroller.getI18n("defect.success.message"));
                that.onClosePopup();
                sap.ui.core.BusyIndicator.hide();
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
                that.MainPODcontroller.showErrorMessageBox(that.MainPODcontroller.getI18n("defect.saveData.error.message"));
                sap.ui.core.BusyIndicator.hide();
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that, true, true);
        },

        updateNonConformanceLevel3: function () {
            var that = this;
            var infoModel = that.MainPODcontroller.getInfoModel();
            var plant = infoModel.getProperty("/plant");
            if (!that.isAdditionalOperation) var sfc = infoModel.getProperty("/selectedSFC/sfc"); else var sfc = that.selectedObject.sfc; 

            let BaseProxyURL = infoModel.getProperty("/BaseProxyURL");
            let pathReasonForVarianceApi = "/db/updateNonConformanceLevel3";
            let url = BaseProxyURL + pathReasonForVarianceApi;

            let params = {
                plant: plant,
                sfc: sfc,
                id_lev_1: infoModel.getProperty("/selectedPrimoLivello").id,
                id_lev_2: that.selectedObject.parent_id_lev_2,
                id_lev_3: that.selectedObject.id_lev_3,
                machine_type: that.selectedObject.machine_type
            };

            // Callback di successo
            var successCallback = function (response) {
                sap.ui.getCore().getEventBus().publish("PrimoLivello", "loadPODOperationsModel", {collapse: false});
            };

            // Callback di errore
            var errorCallback = function (error) {
                console.log("Chiamata POST fallita: ", error);
            };
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        onClosePopup: function () {
            var that = this;
            that.closeDialog();
            that.destroy(); 
        },
        toggleBusyIndicator: function () {
            var that = this;
            var busyState = that.treeTable.getBusy();
            that.treeTable.setBusy(!busyState);
        }
    })
}
)