sap.ui.define([
    "sap/ui/model/resource/ResourceModel",
    "sap/dm/dme/podfoundation/control/PropertyEditor"
], function (ResourceModel, PropertyEditor) {
    "use strict";
    
    var oFormContainer;

    return PropertyEditor.extend( "kpmg.custom.pod.PODTI.PODTI.builder.PropertyEditor" ,{

		constructor: function(sId, mSettings){
			PropertyEditor.apply(this, arguments);
			
			this.setI18nKeyPrefix("customComponentListConfig.");
			this.setResourceBundleName("kpmg.custom.pod.PODTI.PODTI.i18n.builder");
			this.setPluginResourceBundleName("kpmg.custom.pod.PODTI.PODTI.i18n.i18n");
		},
		
		addPropertyEditorContent: function(oPropertyFormContainer){
			var oData = this.getPropertyData();
			
			this.addInputField(oPropertyFormContainer, "BaseProxyURL", oData);
			this.addInputField(oPropertyFormContainer, "Plant", oData);
			this.addInputField(oPropertyFormContainer, "appKey", oData);
			this.addInputField(oPropertyFormContainer, "MarkingWorkCentersListEnabled", oData);

            oFormContainer = oPropertyFormContainer;
		},
		
		getDefaultPropertyData: function(){
			return {
				"BaseProxyURL": "https://proxyServerGdDm.cfapps.eu20-001.hana.ondemand.com",
				"Plant": "GD03",
				"MarkingWorkCentersListEnabled": "GD03"
			};
		}

	});
});